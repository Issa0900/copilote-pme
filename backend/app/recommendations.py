"""Génération de recommandations (PRD Module 19).

Le PRD indique que « chaque risque ou opportunité doit produire une
recommandation ». Les Modules 16/17 (score de risque/opportunité) ne sont
pas construits — il n'y a pas encore de modélisation probabilité/impact
indépendante. La seule source honnête disponible pour l'instant est le
Module 7 (anomalies statistiques) : chaque anomalie de sévérité "high" ou
"medium" (les écarts assez significatifs pour justifier une vérification)
devient une recommandation au format Situation/Analyse/Impact/Action.

Le Module 20 (transformer une recommandation en tâche avec responsable et
date limite) n'est pas implémenté : pas d'entité Task, pas de notion
d'assignation dans le modèle actuel.
"""

import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.anomalies import Anomaly, detect_anomalies
from app.models import Recommendation, Transaction

SEVERITY_TO_PRIORITY = {
    "high": "urgente",
    "medium": "élevée",
    "low": "moyenne",
}

ANALYSIS_TEXT = {
    "transaction_outlier": (
        "Ce montant s'écarte nettement de vos habitudes récentes pour ce type de "
        "transaction (revenu ou dépense), en comparaison de vos autres transactions "
        "validées."
    ),
    "category_trend": (
        "Le total de cette catégorie a nettement changé entre la période récente "
        "et la période précédente, en comparant vos transactions validées."
    ),
}


@dataclass
class RecommendationDraft:
    source_key: str
    type: str
    situation: str
    analysis: str
    impact: str
    action: str
    priority: str
    category: str | None = None


def _source_key(anomaly: Anomaly, detection_period: str) -> str:
    if anomaly.type == "category_trend":
        # Une anomalie de tendance n'a pas d'identifiant de transaction propre
        # (elle porte sur une catégorie entière) : sans dimension temporelle,
        # la clé reste identique indéfiniment et bloque toute nouvelle
        # recommandation pour cette catégorie après le premier traitement.
        # On inclut donc l'année-mois de détection pour permettre une
        # nouvelle recommandation à chaque nouvel épisode (PRD Module 19).
        return f"{anomaly.type}:{anomaly.category or ''}:{detection_period}"
    return f"{anomaly.type}:{anomaly.category or ''}:{anomaly.transaction_id or ''}"


def _impact_and_action(anomaly: Anomaly) -> tuple[str, str]:
    if anomaly.type == "transaction_outlier":
        impact = (
            "Si ce montant est une erreur de saisie ou une transaction "
            "frauduleuse/erronée, il fausse vos KPI (revenus, dépenses, résultat "
            "net) tant qu'il n'est pas vérifié."
        )
        action = (
            "Vérifier cette transaction (pièce justificative, montant, "
            "catégorie) et la corriger si nécessaire."
        )
        return impact, action

    change_pct = anomaly.metadata.get("change_pct", 0)
    if change_pct > 0:
        impact = (
            "Une hausse soutenue et non expliquée dans cette catégorie peut "
            "affecter votre rentabilité si elle n'est pas anticipée."
        )
        action = (
            f"Identifier la cause de la hausse en catégorie « {anomaly.category} » "
            "avant qu'elle ne devienne récurrente."
        )
    else:
        impact = (
            "Une baisse soutenue dans cette catégorie peut signaler un problème "
            "opérationnel ou commercial sous-jacent."
        )
        action = (
            f"Investiguer la baisse en catégorie « {anomaly.category} » "
            "(perte de client, rupture de stock, saisonnalité, etc.)."
        )
    return impact, action


def build_recommendation_drafts(
    anomalies: list[Anomaly], detection_period: str | None = None
) -> list[RecommendationDraft]:
    detection_period = detection_period or date.today().strftime("%Y-%m")
    drafts: list[RecommendationDraft] = []
    for anomaly in anomalies:
        if anomaly.severity not in SEVERITY_TO_PRIORITY:
            continue
        if anomaly.severity == "low":
            continue  # écarts mineurs : gardés comme alerte de surveillance, pas de recommandation

        impact, action = _impact_and_action(anomaly)
        drafts.append(
            RecommendationDraft(
                source_key=_source_key(anomaly, detection_period),
                type=anomaly.type,
                situation=anomaly.message,
                analysis=ANALYSIS_TEXT[anomaly.type],
                impact=impact,
                action=action,
                priority=SEVERITY_TO_PRIORITY[anomaly.severity],
                category=anomaly.category,
            )
        )
    return drafts


def _commit_new_recommendations(db: Session) -> None:
    """Commit les recommandations ajoutées à la session (via ``db.add``).

    Ce endpoint est un GET appelé sans coordination entre requêtes
    concurrentes (deux onglets, préfetch, plusieurs utilisateurs) : deux
    requêtes peuvent constater simultanément qu'une même ``source_key``
    n'existe pas encore et tenter de l'insérer toutes les deux, ce qui viole
    ``uq_recommendation_source``. Plutôt que de laisser l'``IntegrityError``
    remonter en 500, on annule notre transaction — les recommandations déjà
    commitées par la requête concurrente restent visibles pour la lecture
    qui suit cet appel (cf. routers/recommendations.py::list_recommendations).
    Pas besoin de relire ici : sync_recommendations ne retourne rien, seul
    l'appelant lit la liste finale.
    """
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


def sync_recommendations(company_id: uuid.UUID, db: Session) -> None:
    """Crée les recommandations manquantes pour les anomalies actuelles.

    Idempotent : une recommandation déjà générée pour une même anomalie
    (source_key) n'est jamais recréée, même si son statut a changé
    (acceptée/rejetée) — l'action de l'utilisateur est préservée.
    """
    transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "validated")
        .all()
    )
    anomalies = detect_anomalies(transactions)
    drafts = build_recommendation_drafts(anomalies)

    existing_keys = {
        row[0]
        for row in db.query(Recommendation.source_key).filter(
            Recommendation.company_id == company_id
        )
    }

    new_drafts = [draft for draft in drafts if draft.source_key not in existing_keys]
    if not new_drafts:
        return

    for draft in new_drafts:
        db.add(
            Recommendation(
                company_id=company_id,
                source_type="anomaly",
                source_key=draft.source_key,
                type=draft.type,
                category=draft.category,
                situation=draft.situation,
                analysis=draft.analysis,
                impact=draft.impact,
                action=draft.action,
                priority=draft.priority,
            )
        )
    _commit_new_recommendations(db)
