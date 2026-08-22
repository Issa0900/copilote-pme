"""Détection d'anomalies statistique (PRD Module 7, section 13).

Comparaisons implémentées : groupes de transactions inhabituelles récentes
par catégorie (baseline robuste médiane/MAD) et écart entre période récente
et période antérieure par catégorie (tendance). Ce sont des interprétations
statistiques du système (étiquette ANALYSE, PRD section 44), pas des faits
bruts.

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


def _detect_category_outlier_clusters(transactions: list[Transaction]) -> list[Anomaly]:
    dated = [t for t in transactions if t.date is not None and t.category and t.amount]
    if not dated:
        return []

    anchor = max(t.date for t in dated)
    window_start = anchor - timedelta(days=RECENT_WINDOW_DAYS)

    groups: dict[tuple[str, str], dict[str, list]] = {}
    for t in dated:
        sign = "revenu" if t.amount > 0 else "depense"
        key = (t.category, sign)
        bucket = groups.setdefault(key, {"baseline": [], "recent": []})
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
                f"{plural} {plural_participle} ces {RECENT_WINDOW_DAYS} derniers jours "
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
                metadata={
                    "count": count,
                    "total": round(total, 2),
                    "median": round(median, 2),
                    "worst_z": round(worst_z, 2),
                },
            )
        )

    return anomalies


def _detect_category_trends(transactions: list[Transaction]) -> list[Anomaly]:
    dated = [t for t in transactions if t.date is not None and t.category]
    if len(dated) < MIN_PER_PERIOD_FOR_TREND * 2:
        return []

    sorted_dates = sorted(t.date for t in dated)
    median_date = sorted_dates[len(sorted_dates) // 2]

    by_category: dict[str, dict[str, list[float]]] = {}
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
            anomalies.append(
                Anomaly(
                    type="category_trend",
                    severity=_trend_severity(abs(change)),
                    message=(
                        f"Les montants en catégorie « {category} » sont "
                        f"{abs(change) * 100:.0f} % {direction} à la période précédente "
                        f"({earlier_total:.2f} $ → {recent_total:.2f} $)."
                    ),
                    category=category,
                    metadata={
                        "earlier_total": round(earlier_total, 2),
                        "recent_total": round(recent_total, 2),
                        "change_pct": round(change * 100, 1),
                    },
                )
            )

    return anomalies


def detect_anomalies(transactions: list[Transaction]) -> list[Anomaly]:
    anomalies = _detect_category_outlier_clusters(transactions) + _detect_category_trends(
        transactions
    )
    severity_rank = {"high": 0, "medium": 1, "low": 2}
    anomalies.sort(key=lambda a: severity_rank[a.severity])
    return anomalies[:MAX_ANOMALIES]
