"""Détection d'anomalies statistique (PRD Module 7, section 13).

Comparaisons implémentées : groupes de transactions inhabituelles récentes
par catégorie (baseline robuste médiane/MAD), écart entre période récente
et période antérieure par catégorie (tendance), et marge nette sous
l'objectif en baisse marquée (règle déterministe globale, pas par
catégorie). Ce sont des interprétations statistiques du système (étiquette
ANALYSE, PRD section 44), pas des faits bruts.

Les trois règles ci-dessus correspondent exactement aux trois exigées par
la spec (§64.12 : « Le MVP doit contenir au minimum 3 règles déterministes »
— Marge, Dépenses, Ventes) : `_detect_margin_decline` couvre Marge,
`_detect_category_trends` couvre Dépenses/Ventes par catégorie (un même
mécanisme symétrique, une hausse en catégorie de dépense ou une baisse en
catégorie de revenu déclenchent l'une ou l'autre).

Le détecteur d'anomalies transactionnelles regroupe volontairement les
transactions signalées par catégorie plutôt que d'émettre une anomalie par
transaction : sur un gros volume de données (ex. un import de 60 000 lignes),
un seuil purement statistique appliqué ligne par ligne produit des centaines
d'alertes quasi identiques et noie le signal utile. Le volume est ici
structurellement plafonné au nombre de catégories × 2 (revenu/dépense), pas
au nombre de transactions — complété par un plafond global en filet de
sécurité (``MAX_ANOMALIES``).

Le Module 6 (analyse causale — "cause probable : ...") n'est pas implémenté
ici : il nécessiterait un raisonnement (coût fournisseur, mix produit,
publicité...) sur des données que le modèle actuel ne capture pas encore
(pas de rattachement fournisseur/produit par transaction).
"""

import statistics
from dataclasses import dataclass, field
from datetime import date, timedelta

from app.models import Transaction

# Fenêtre récente ancrée sur la donnée elle-même (date la plus récente parmi
# les transactions), pas sur l'horloge serveur — contrairement au filtre de
# période du tableau de bord (choix de navigation de l'utilisateur, lui
# ancré sur le calendrier réel), ce détecteur doit rester utile même si le
# dernier import remonte à un moment quelconque dans le passé des données.
RECENT_WINDOW_DAYS = 30
MIN_BASELINE_SAMPLE = 8
ROBUST_Z_THRESHOLD = 3.5
MAD_SCALE = 0.6745  # constante standard pour que le MAD approxime l'écart-type

MAX_ANOMALIES = 20

MIN_PER_PERIOD_FOR_TREND = 2
TREND_CHANGE_THRESHOLD = 0.3  # 30 %

# Règle "Marge" (spec §12/§18, exemple littéral :
# `if margin < target_margin and margin_change <= -3: create_alert(...)`).
# Seuil de baisse repris tel quel de l'exemple de la spec.
MARGIN_DECLINE_THRESHOLD_POINTS = 3.0

# Marge cible par défaut quand l'entreprise n'en a pas défini une. Duplique
# `health.DEFAULT_TARGET_MARGIN` (même valeur, même origine PRD) plutôt que
# de l'importer : `health.py` importe déjà `detect_anomalies` d'ici, un
# import dans l'autre sens créerait un cycle.
DEFAULT_TARGET_MARGIN_PCT = 20.0

MONTHS_FR = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
]


def _format_date_fr(d: date) -> str:
    """Formate une date en français lisible (ex. « 15 mars 2026 »).

    Pas de dépendance à `locale` (non fiable en multi-plateforme/serveur) :
    on mappe directement le mois plutôt que d'utiliser `strftime("%B")`.
    """
    return f"{d.day} {MONTHS_FR[d.month - 1]} {d.year}"


@dataclass
class Anomaly:
    type: str
    severity: str
    message: str
    category: str | None = None
    transaction_id: str | None = None
    detected_at: date | None = None
    metadata: dict = field(default_factory=dict)

    # Décomposition « Quoi / Pourquoi / Impact / Action » : `message` répond au
    # « quoi », les trois champs ci-dessous complètent le raisonnement pour que
    # le dirigeant puisse décider sans avoir à deviner ce que le système a
    # regardé. `why` décrit la méthode de détection (jamais une cause métier
    # affirmée : l'analyse causale relève du Module 6, non implémenté).
    why: str | None = None
    impact_amount: float | None = None
    action: str | None = None


def _cluster_severity(worst_z: float) -> str:
    if worst_z >= 6:
        return "high"
    if worst_z >= 4.5:
        return "medium"
    return "low"


def _trend_severity(change: float) -> str:
    if change >= 0.75:
        return "high"
    if change >= 0.5:
        return "medium"
    return "low"


def _detect_category_outlier_clusters(
    transactions: list[Transaction],
    *,
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[Anomaly]:
    dated = [t for t in transactions if t.date is not None and t.category and t.amount]
    if not dated:
        return []

    if period_start is not None and period_end is not None:
        # Fenêtre "recent" = la période réellement sélectionnée au tableau de
        # bord, pas une fenêtre glissante de 30 jours ancrée sur la donnée.
        # La baseline, elle, reste TOUTE l'historique antérieure à
        # `period_start` reçue en entrée — une fenêtre "période précédente"
        # de même durée serait souvent trop courte pour atteindre
        # MIN_BASELINE_SAMPLE et casserait la robustesse statistique du
        # calcul médiane/MAD. Ce choix mélange donc volontairement une
        # fenêtre de comparaison calendaire précise pour "recent" avec un
        # historique complet pour "baseline", par nécessité statistique.
        anchor = period_end
        window_start = period_start
    else:
        anchor = max(t.date for t in dated)
        window_start = anchor - timedelta(days=RECENT_WINDOW_DAYS)

    groups: dict[tuple[str, str], dict[str, list]] = {}
    for t in dated:
        sign = "revenu" if t.amount > 0 else "depense"
        key = (t.category, sign)
        bucket = groups.setdefault(key, {"baseline": [], "recent": []})
        if period_start is not None and period_end is not None:
            if window_start <= t.date <= anchor:
                target = "recent"
            elif t.date < window_start:
                target = "baseline"
            else:
                # Transaction postérieure à la période sélectionnée : hors
                # champ, ni recent ni baseline.
                continue
        else:
            target = "recent" if t.date >= window_start else "baseline"
        bucket[target].append(t)

    subjects = {
        "revenu": ("Un revenu inhabituel", "détecté", "Des revenus inhabituels", "détectés"),
        "depense": (
            "Une dépense inhabituelle",
            "détectée",
            "Des dépenses inhabituelles",
            "détectées",
        ),
    }

    # Le message doit décrire la fenêtre réellement analysée : la période
    # sélectionnée quand il y en a une, la fenêtre glissante sinon.
    if period_start is not None and period_end is not None:
        window_txt = (
            f"sur la période du {_format_date_fr(window_start)} "
            f"au {_format_date_fr(anchor)}"
        )
    else:
        window_txt = f"ces {RECENT_WINDOW_DAYS} derniers jours"

    anomalies: list[Anomaly] = []
    for (category, sign), bucket in groups.items():
        baseline = bucket["baseline"]
        recent = bucket["recent"]
        if len(baseline) < MIN_BASELINE_SAMPLE or not recent:
            continue

        baseline_amounts = [abs(float(t.amount)) for t in baseline]
        median = statistics.median(baseline_amounts)
        mad = statistics.median([abs(a - median) for a in baseline_amounts])
        robust_mad = max(mad, median * 0.05, 0.01)

        flagged: list[tuple[Transaction, float, float]] = []
        for t in recent:
            amount = abs(float(t.amount))
            z = abs(MAD_SCALE * (amount - median) / robust_mad)
            if z >= ROBUST_Z_THRESHOLD:
                flagged.append((t, amount, z))

        if not flagged:
            continue

        worst_z = max(z for _, _, z in flagged)
        total = sum(amount for _, amount, _ in flagged)
        count = len(flagged)
        singular, participle, plural, plural_participle = subjects[sign]

        if count == 1:
            t, amount, _ = flagged[0]
            message = (
                f"{singular} de {amount:.2f} $ a été {participle} le "
                f"{_format_date_fr(t.date) if t.date else 'date inconnue'} ({category}), "
                f"contre une médiane habituelle de {median:.2f} $."
            )
        else:
            message = (
                f"{plural} {plural_participle} {window_txt} "
                f"en catégorie « {category} » : {count} transactions totalisant "
                f"{total:.2f} $ (médiane habituelle : {median:.2f} $)."
            )

        anomalies.append(
            Anomaly(
                type="transaction_outlier",
                severity=_cluster_severity(worst_z),
                message=message,
                category=category,
                transaction_id=(str(flagged[0][0].id) if count == 1 else None),
                detected_at=anchor,
                why=(
                    f"Montant{'s' if count > 1 else ''} très éloigné"
                    f"{'s' if count > 1 else ''} de la médiane habituelle de la "
                    f"catégorie ({median:.2f} $), mesuré sur l'écart médian absolu "
                    f"des {len(baseline)} transactions antérieures."
                ),
                # Écart au comportement habituel, pas le montant brut : c'est
                # le surcoût (ou surplus) réellement imputable à l'anomalie.
                impact_amount=round(total - median * count, 2),
                action=(
                    f"Vérifier ces {count} transactions en catégorie « {category} »."
                    if count > 1
                    else f"Vérifier cette transaction en catégorie « {category} »."
                ),
                metadata={
                    "count": count,
                    "total": round(total, 2),
                    "median": round(median, 2),
                    "worst_z": round(worst_z, 2),
                },
            )
        )

    return anomalies


def _detect_category_trends(
    transactions: list[Transaction],
    *,
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[Anomaly]:
    dated = [t for t in transactions if t.date is not None and t.category]
    if len(dated) < MIN_PER_PERIOD_FOR_TREND * 2:
        return []

    has_period = period_start is not None and period_end is not None
    if has_period:
        # Vraie période calendaire sélectionnée : "recent" = la période
        # demandée, "earlier" = la période précédente immédiatement
        # contiguë de même durée (même formule que
        # `dashboard.py::get_company_kpis_variance`).
        span = period_end - period_start
        previous_end = period_start - timedelta(days=1)
        previous_start = previous_end - span

        by_category: dict[str, dict[str, list[float]]] = {}
        for t in dated:
            if period_start <= t.date <= period_end:
                bucket = "recent"
            elif previous_start <= t.date <= previous_end:
                bucket = "earlier"
            else:
                continue
            by_category.setdefault(t.category, {"earlier": [], "recent": []})
            by_category[t.category][bucket].append(abs(float(t.amount or 0)))
    else:
        # Comportement historique : pas de période sélectionnée (vue "tout
        # l'historique"), on coupe à la date médiane de tout l'historique
        # chargé — un partage par moitié, pas une vraie comparaison
        # calendaire.
        sorted_dates = sorted(t.date for t in dated)
        median_date = sorted_dates[len(sorted_dates) // 2]

        by_category = {}
        for t in dated:
            bucket = "recent" if t.date >= median_date else "earlier"
            by_category.setdefault(t.category, {"earlier": [], "recent": []})
            by_category[t.category][bucket].append(abs(float(t.amount or 0)))

    anomalies: list[Anomaly] = []
    for category, periods in by_category.items():
        earlier, recent = periods["earlier"], periods["recent"]
        if len(earlier) < MIN_PER_PERIOD_FOR_TREND or len(recent) < MIN_PER_PERIOD_FOR_TREND:
            continue

        earlier_total = sum(earlier)
        recent_total = sum(recent)
        if earlier_total == 0:
            continue

        change = (recent_total - earlier_total) / earlier_total
        if abs(change) >= TREND_CHANGE_THRESHOLD:
            direction = "supérieurs" if change > 0 else "inférieurs"
            if has_period:
                comparison_txt = "à la période précédente"
                why = (
                    f"Comparaison des montants de cette catégorie entre la "
                    f"période sélectionnée ({len(recent)} transactions) et la "
                    f"période précédente de même durée ({len(earlier)} transactions)."
                )
            else:
                comparison_txt = (
                    "à la période antérieure comparable (répartition par moitié "
                    "de l'historique chargé, faute de période sélectionnée)"
                )
                why = (
                    f"Comparaison des montants de cette catégorie entre la "
                    f"moitié la plus récente ({len(recent)} transactions) et la "
                    f"moitié la plus ancienne ({len(earlier)} transactions) de "
                    f"tout l'historique chargé, coupées à la date médiane — "
                    f"aucune période n'a été sélectionnée pour une comparaison "
                    f"calendaire précise."
                )
            anomalies.append(
                Anomaly(
                    type="category_trend",
                    severity=_trend_severity(abs(change)),
                    message=(
                        f"Les montants en catégorie « {category} » sont "
                        f"{abs(change) * 100:.0f} % {direction} {comparison_txt} "
                        f"({earlier_total:.2f} $ → {recent_total:.2f} $)."
                    ),
                    category=category,
                    why=why,
                    impact_amount=round(recent_total - earlier_total, 2),
                    action=(
                        f"Examiner les transactions récentes en catégorie "
                        f"« {category} » pour confirmer si cette évolution est voulue."
                    ),
                    metadata={
                        "earlier_total": round(earlier_total, 2),
                        "recent_total": round(recent_total, 2),
                        "change_pct": round(change * 100, 1),
                    },
                )
            )

    return anomalies


def _net_margin_pct(transactions: list[Transaction]) -> float | None:
    """Marge nette (%) sur un ensemble de transactions déjà chargé — même
    formule que `kpis.py::compute_company_kpis` (net_margin_pct), mais
    recalculée en Python : ce détecteur ne dispose pas d'une session DB pour
    ré-agréger via SQL. `None` sans revenu, jamais 0 % (spec §64.8)."""
    revenue = sum(float(t.amount) for t in transactions if t.amount and t.amount > 0)
    if revenue <= 0:
        return None
    expenses = sum(-float(t.amount) for t in transactions if t.amount and t.amount < 0)
    return (revenue - expenses) / revenue * 100


def _margin_severity(gap_to_target: float, change: float) -> str:
    if gap_to_target >= 10 or change <= -8:
        return "high"
    if gap_to_target >= 5 or change <= -5:
        return "medium"
    return "low"


def _detect_margin_decline(
    transactions: list[Transaction],
    *,
    period_start: date | None = None,
    period_end: date | None = None,
    target_margin_pct: float,
) -> list[Anomaly]:
    """Règle déterministe "Marge" (spec §12/§18, une des 3 minimales exigées
    par §64.12) : marge nette sous l'objectif ET en baisse d'au moins
    `MARGIN_DECLINE_THRESHOLD_POINTS` points par rapport à la période de
    comparaison.

    Contrairement aux deux autres règles (par transaction / par catégorie),
    celle-ci porte sur l'entreprise entière — `category` reste `None`. Le
    partage recent/earlier reprend exactement celui de
    `_detect_category_trends` (période sélectionnée vs période précédente
    contiguë de même durée, ou partage par moitié de l'historique faute de
    période) pour rester cohérente avec le reste du détecteur."""
    dated = [t for t in transactions if t.date is not None]
    if not dated:
        return []

    has_period = period_start is not None and period_end is not None
    if has_period:
        span = period_end - period_start
        previous_end = period_start - timedelta(days=1)
        previous_start = previous_end - span
        recent = [t for t in dated if period_start <= t.date <= period_end]
        earlier = [t for t in dated if previous_start <= t.date <= previous_end]
        comparison_txt = "la période précédente"
    else:
        sorted_dates = sorted(t.date for t in dated)
        median_date = sorted_dates[len(sorted_dates) // 2]
        recent = [t for t in dated if t.date >= median_date]
        earlier = [t for t in dated if t.date < median_date]
        comparison_txt = (
            "la moitié la plus ancienne de l'historique chargé, faute de "
            "période sélectionnée"
        )

    current_margin = _net_margin_pct(recent)
    previous_margin = _net_margin_pct(earlier)
    if current_margin is None or previous_margin is None:
        return []
    if current_margin >= target_margin_pct:
        return []

    change = current_margin - previous_margin
    if change > -MARGIN_DECLINE_THRESHOLD_POINTS:
        return []

    recent_revenue = sum(float(t.amount) for t in recent if t.amount and t.amount > 0)
    # Manque à gagner vs la marge de la période de comparaison, sur le CA
    # réellement réalisé cette période — pas un montant brut, l'écart
    # imputable au recul de marge (même logique que les deux autres règles).
    impact = round(recent_revenue * change / 100, 2)
    gap_to_target = target_margin_pct - current_margin

    return [
        Anomaly(
            type="margin_decline",
            severity=_margin_severity(gap_to_target, change),
            message=(
                f"La marge nette est de {current_margin:.1f} % (objectif : "
                f"{target_margin_pct:.1f} %), en baisse de {abs(change):.1f} points "
                f"par rapport à {comparison_txt} ({previous_margin:.1f} %)."
            ),
            detected_at=period_end if has_period else max(t.date for t in dated),
            why=(
                "Règle déterministe (spec §12/§18) : marge nette sous l'objectif "
                f"et en baisse d'au moins {MARGIN_DECLINE_THRESHOLD_POINTS:.0f} "
                f"points par rapport à {comparison_txt}."
            ),
            impact_amount=impact,
            action=(
                "Vérifier les postes de revenus et de dépenses qui ont fait "
                "bouger la marge sur cette période."
            ),
            metadata={
                "current_margin_pct": round(current_margin, 1),
                "previous_margin_pct": round(previous_margin, 1),
                "target_margin_pct": round(target_margin_pct, 1),
                "change_pct_points": round(change, 1),
            },
        )
    ]


def detect_anomalies(
    transactions: list[Transaction],
    *,
    period_start: date | None = None,
    period_end: date | None = None,
    target_margin_pct: float = DEFAULT_TARGET_MARGIN_PCT,
) -> list[Anomaly]:
    """Si ``period_start``/``period_end`` sont fournis, les détecteurs
    comparent la période sélectionnée à la période précédente immédiatement
    contiguë de même durée (même formule que
    `dashboard.py::get_company_kpis_variance`) au lieu de leurs fenêtres par
    défaut (30 jours ancrés sur la donnée / partage médian de l'historique).
    Sans période (``None``/``None``), comportement historique inchangé.

    ``target_margin_pct`` vient de `Company.target_margin_pct` — c'est
    l'appelant (qui a la session DB) qui le résout et le transmet ici."""
    anomalies = (
        _detect_category_outlier_clusters(
            transactions, period_start=period_start, period_end=period_end
        )
        + _detect_category_trends(
            transactions, period_start=period_start, period_end=period_end
        )
        + _detect_margin_decline(
            transactions,
            period_start=period_start,
            period_end=period_end,
            target_margin_pct=target_margin_pct,
        )
    )
    severity_rank = {"high": 0, "medium": 1, "low": 2}
    anomalies.sort(key=lambda a: severity_rank[a.severity])
    return anomalies[:MAX_ANOMALIES]
