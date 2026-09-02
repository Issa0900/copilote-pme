"""Score de santé global (PRD Module 5, « situation globale »).

Principe : le score n'est jamais une boîte noire. Chaque dimension expose sa
note ET la phrase qui explique d'où elle vient, pour que le dirigeant puisse
vérifier le raisonnement au lieu de faire confiance à un chiffre magique
(principe de confiance, section 44 du PRD).

Volontairement limité aux dimensions réellement mesurables avec les données
dont dispose le MVP (transactions importées) : rentabilité, maîtrise des
dépenses, activité, qualité des données. Les dimensions annoncées au PRD mais
non mesurables aujourd'hui (trésorerie, marketing, RH, opérations) ne sont pas
inventées ici — elles apparaîtront quand leurs sources existeront.
"""

import uuid
from datetime import date as date_type
from datetime import timedelta

from sqlalchemy.orm import Session

from app.anomalies import detect_anomalies
from app.kpis import compute_company_kpis
from app.models import Company, Transaction
from app.schemas import HealthDimension, HealthScore

DEFAULT_TARGET_MARGIN = 20.0
DEFAULT_HEALTHY_THRESHOLD = 80

# Paliers de statut, exprimés en fraction du seuil « sain » choisi par le
# dirigeant : régler ce seuil déplace toute l'échelle de façon cohérente,
# plutôt que d'obliger à saisir cinq bornes séparées. Les ratios reproduisent
# l'échelle de la spécification (§7 : 90 excellent / 75 sain / 60 stable /
# 40 vigilance / 20 risque) rapportée à un seuil « sain » de 80.
_STATUS_STEPS = [
    (1.13, "excellent", "Excellente situation"),
    (0.94, "sain", "Bonne situation"),
    (0.75, "stable", "Situation stable"),
    (0.50, "vigilance", "Points de vigilance"),
    (0.25, "risque", "Situation à risque"),
    (0.00, "critique", "Situation critique"),
]

# Ordre de gravité, du meilleur au pire — sert à rétrograder un statut sans
# avoir à manipuler des indices numériques dispersés dans le code.
_STATUS_ORDER = ["excellent", "sain", "stable", "vigilance", "risque", "critique"]

_STATUS_LABELS = {
    "excellent": "Excellente situation",
    "sain": "Bonne situation",
    "stable": "Situation stable",
    "vigilance": "Points de vigilance",
    "risque": "Situation à risque",
    "critique": "Situation critique",
}

# En dessous de cette note, une dimension est jugée critique et fait
# rétrograder le statut global quelle que soit la moyenne (spécification §7 :
# « le score global ne doit pas être une simple moyenne — une anomalie
# critique peut dégrader le statut global »).
CRITICAL_DIMENSION_SCORE = 35


def _status_for(score: int, healthy_threshold: int) -> tuple[str, str]:
    for ratio, status, label in _STATUS_STEPS:
        if score >= healthy_threshold * ratio:
            return status, label
    return "critique", "Situation critique"


def _downgrade(status: str, steps: int) -> str:
    """Rétrograde un statut de `steps` crans, sans jamais dépasser « critique »."""
    index = _STATUS_ORDER.index(status)
    return _STATUS_ORDER[min(index + steps, len(_STATUS_ORDER) - 1)]


def _clamp(value: float) -> int:
    return int(max(0, min(100, round(value))))


def compute_health_score(
    company_id: uuid.UUID,
    db: Session,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    anomaly_source: list[Transaction] | None = None,
) -> HealthScore:
    kpis = compute_company_kpis(company_id, db, start_date, end_date)

    # Période précédente de même durée, pour la dimension Trajectoire. Elle
    # n'existe que si une plage est demandée : sur « tout l'historique », il
    # n'y a rien avant à quoi se comparer.
    previous = None
    if start_date is not None and end_date is not None:
        span = end_date - start_date
        previous_end = start_date - timedelta(days=1)
        previous = compute_company_kpis(
            company_id, db, previous_end - span, previous_end
        )

    company = db.get(Company, company_id)
    target_margin = (
        float(company.target_margin_pct)
        if company is not None and company.target_margin_pct
        else DEFAULT_TARGET_MARGIN
    )
    healthy_threshold = (
        int(company.health_healthy_threshold)
        if company is not None and company.health_healthy_threshold
        else DEFAULT_HEALTHY_THRESHOLD
    )

    # Même source que GET /anomalies : le détecteur travaille sur les
    # transactions validées. Le détecteur lui-même reste bien scopé sur la
    # période choisie pour ses résultats "recent"/"earlier" (via
    # `period_start`/`period_end` passés à `detect_anomalies` ci-dessous) :
    # « Stabilité » compare donc la même fenêtre calendaire que les autres
    # dimensions. Mais la REQUÊTE, elle, charge plus large volontairement —
    # sans borne basse — car le détecteur a besoin de l'historique antérieur
    # à `start_date` pour sa baseline statistique (médiane/MAD, comparaison
    # avec la période précédente) ; la borne haute (`end_date`) reste
    # appliquée pour ne pas charger de données futures hors de la vue
    # choisie.
    # `anomalies` accepte une liste déjà chargée : l'appelant qui a besoin des
    # deux (score + liste d'anomalies) peut la charger une seule fois.
    if anomaly_source is None:
        query = db.query(Transaction).filter(
            Transaction.company_id == company_id, Transaction.status == "validated"
        )
        if end_date is not None:
            query = query.filter(Transaction.date <= end_date)
        anomaly_source = query.all()
    anomalies = detect_anomalies(anomaly_source, period_start=start_date, period_end=end_date)

    dimensions: list[HealthDimension] = []

    # --- Rentabilité : marge nette rapportée à une cible de référence -------
    # La marge vient de `compute_company_kpis` (`net_margin_pct`) et n'est plus
    # recalculée ici : une seule définition de la marge dans tout le code.
    # `net_margin_pct is None` <=> aucun revenu sur la période.
    if kpis.net_margin_pct is not None:
        margin = kpis.net_margin_pct
        profitability = _clamp((margin / target_margin) * 100) if target_margin else 0
        profitability_explanation = (
            f"Marge nette de {margin:.1f} % sur la période "
            f"(votre cible : {target_margin:.0f} %)."
        )
    else:
        profitability = 0
        profitability_explanation = "Aucun revenu enregistré sur la période."
    dimensions.append(
        HealthDimension(
            key="rentabilite",
            label="Rentabilité",
            score=profitability,
            explanation=profitability_explanation,
        )
    )

    # --- Dépenses : part du revenu absorbée par les dépenses ---------------
    if kpis.revenue_total > 0:
        expense_ratio = (kpis.expenses_total / kpis.revenue_total) * 100
        # Le repère n'est pas « zéro dépense » (irréaliste pour toute
        # entreprise réelle) mais le niveau de dépenses compatible avec la
        # marge visée : viser 18 % de marge, c'est admettre 82 % de dépenses.
        # Au-delà, la note décroît d'autant plus vite que le dépassement est
        # important, et tombe à 0 quand les dépenses dépassent de moitié le
        # budget implicite.
        allowed_ratio = max(1.0, 100 - target_margin)
        excess = expense_ratio - allowed_ratio
        expenses_score = _clamp(100 if excess <= 0 else 100 - (excess / allowed_ratio) * 200)
        expenses_explanation = (
            f"Les dépenses représentent {expense_ratio:.0f} % des revenus "
            f"(votre cible de marge en autorise {allowed_ratio:.0f} %)."
        )
    else:
        expenses_score = 0
        expenses_explanation = "Impossible à évaluer sans revenu sur la période."
    dimensions.append(
        HealthDimension(
            key="depenses",
            label="Dépenses",
            score=expenses_score,
            explanation=expenses_explanation,
        )
    )

    # --- Stabilité : pénalisée par les anomalies détectées -----------------
    if kpis.transactions_count == 0:
        # Sans données, « aucune anomalie détectée » ne veut pas dire « tout va
        # bien » : ne rien avoir à analyser n'est pas un gage de stabilité.
        # Noter 100 ici gonflerait artificiellement le score d'une entreprise
        # qui n'a encore rien importé.
        stability = 0
        stability_explanation = "Pas encore de données pour évaluer la stabilité."
    else:
        high = sum(1 for a in anomalies if a.severity == "high")
        medium = sum(1 for a in anomalies if a.severity == "medium")
        stability = _clamp(100 - (high * 20) - (medium * 8))
        if high or medium:
            stability_explanation = (
                f"{high} écart(s) important(s) et {medium} écart(s) modéré(s) détectés."
            )
        else:
            stability_explanation = "Aucun écart significatif détecté sur la période."
    dimensions.append(
        HealthDimension(
            key="stabilite",
            label="Stabilité",
            score=stability,
            explanation=stability_explanation,
        )
    )

    # --- Trajectoire : la marge progresse-t-elle ou se dégrade-t-elle ? ----
    # Sans cette dimension, le score ne mesure que des niveaux à l'instant T :
    # une entreprise dont la marge tombe de 37 % à 17 % reste « saine » tant
    # qu'elle frôle sa cible, et le produit rassure au pire moment. On note
    # donc l'écart de marge en POINTS entre la période et la précédente.
    if kpis.transactions_count == 0:
        # Même raisonnement que pour la Stabilité : sans données, on ne peut
        # rien dire d'une trajectoire, et une note « neutre » remonterait
        # artificiellement le score d'une entreprise qui n'a rien importé.
        trajectory = 0
        trajectory_explanation = "Pas encore de données pour évaluer la trajectoire."
    elif (
        previous is not None
        and previous.net_margin_pct is not None
        and kpis.net_margin_pct is not None
    ):
        # Les deux marges viennent de `compute_company_kpis` : la période et la
        # précédente sont donc comparées avec exactement la même définition.
        margin_shift = kpis.net_margin_pct - previous.net_margin_pct

        # Barème : stable (±1 pt) = 80. Chaque point perdu coûte 8 points de
        # note, chaque point gagné en rapporte 4 — la dégradation pèse plus
        # lourd que l'amélioration, parce qu'elle appelle une décision.
        if margin_shift >= 1:
            trajectory = _clamp(80 + margin_shift * 4)
        elif margin_shift <= -1:
            trajectory = _clamp(80 + margin_shift * 8)
        else:
            trajectory = 80

        direction = "progresse de" if margin_shift >= 0 else "recule de"
        trajectory_explanation = (
            f"La marge {direction} {abs(margin_shift):.1f} point(s) "
            f"par rapport à la période précédente."
        )
    else:
        # Pas de période précédente comparable : on ne peut rien affirmer sur
        # la trajectoire. Noter 0 pénaliserait à tort, noter 100 rassurerait à
        # tort — on retient une note neutre en le disant explicitement.
        trajectory = 50
        trajectory_explanation = "Aucune période précédente comparable sur cette vue."

    dimensions.append(
        HealthDimension(
            key="trajectoire",
            label="Trajectoire",
            score=trajectory,
            explanation=trajectory_explanation,
        )
    )

    # --- Qualité des données : part des lignes exploitables ---------------
    total_rows = kpis.transactions_count + kpis.quarantined_count
    if total_rows > 0:
        quality = _clamp((kpis.transactions_count / total_rows) * 100)
        quality_explanation = (
            f"{kpis.transactions_count} ligne(s) exploitable(s) sur {total_rows} importée(s)."
        )
    else:
        quality = 0
        quality_explanation = "Aucune donnée importée."
    dimensions.append(
        HealthDimension(
            key="qualite",
            label="Qualité des données",
            score=quality,
            explanation=quality_explanation,
        )
    )

    overall = _clamp(sum(d.score for d in dimensions) / len(dimensions))
    status, label = _status_for(overall, healthy_threshold)

    # Spécification §7 : le statut n'est pas la simple traduction de la
    # moyenne. Une dimension en situation critique rétrograde le verdict d'un
    # cran par dimension concernée — sinon trois dimensions excellentes
    # suffiraient à masquer un effondrement sur la quatrième, ce qui est
    # précisément le cas où le dirigeant a le plus besoin d'être averti.
    critical = [d for d in dimensions if d.score < CRITICAL_DIMENSION_SCORE]
    if critical:
        status = _downgrade(status, len(critical))
        label = _STATUS_LABELS[status]

    improving = sum(1 for d in dimensions if d.score >= 70)
    watch = sum(1 for d in dimensions if d.score < 50)

    if kpis.transactions_count == 0:
        summary = "Aucune donnée validée sur la période : importez un fichier pour obtenir un diagnostic."
    else:
        margin_txt = (
            f"votre marge nette est de {kpis.net_margin_pct:.1f} %"
            if kpis.net_margin_pct is not None
            else "aucun revenu n'est enregistré"
        )
        summary = f"Sur la période analysée, {margin_txt}."

        # La dimension critique passe AVANT le décompte des points de
        # vigilance : c'est elle qui a fait rétrograder le statut, elle doit
        # donc être nommée dans la phrase, pas noyée dans un compteur.
        if critical:
            worst = min(critical, key=lambda d: d.score)
            summary += f" Attention : {worst.label.lower()} — {worst.explanation}"
        elif watch:
            summary += f" {watch} point(s) de vigilance nécessite(nt) votre attention."
        else:
            summary += " Aucun point de vigilance majeur."

    return HealthScore(
        score=overall,
        label=label,
        status=status,
        summary=summary,
        improving_count=improving,
        watch_count=watch,
        dimensions=dimensions,
    )
