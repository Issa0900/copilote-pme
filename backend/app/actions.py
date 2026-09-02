"""Centre d'actions (PRD Module 20, spec §31/§32) — ferme la boucle
décisionnelle. Une recommandation acceptée reste un statut changé, jamais
un suivi ; ce module transforme une recommandation en `Action` suivie
(statut, échéance) et mesure si elle a réellement produit un résultat
(avant/après), spec §64.16/§64.17.

Volontairement pas de champ « assigné » (spec §31) : aucune fonctionnalité
d'invitation d'équipe n'existe encore, un sélecteur à une seule option
n'aiderait personne.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.kpis import compute_category_total, compute_company_kpis
from app.models import Action, Recommendation

# Durée des deux fenêtres de mesure (avant la création de l'action, puis
# après). Même longueur des deux côtés : une comparaison avant/après n'a de
# sens que sur des périodes de durée égale.
MEASUREMENT_WINDOW_DAYS = 30


class RecommendationNotFoundError(Exception):
    pass


def _measure(
    company_id: uuid.UUID,
    db: Session,
    category: str | None,
    start_date: date,
    end_date: date,
) -> float:
    """Valeur mesurée sur une fenêtre : total signé de la catégorie
    d'origine, ou `net_margin_pct` quand la recommandation n'avait pas de
    catégorie (règle "Marge", `anomalies.py::_detect_margin_decline`)."""
    if category is not None:
        return compute_category_total(company_id, db, category, start_date, end_date)
    kpis = compute_company_kpis(company_id, db, start_date, end_date)
    # Sans revenu sur la fenêtre, la marge n'existe pas (spec §64.8) — 0.0
    # reste le choix le moins trompeur ici (pas de case "non mesurable" dans
    # le modèle Action pour l'instant) : une marge à 0 % lue comme "aucune
    # amélioration" n'affirme rien de faux, contrairement à une valeur
    # inventée.
    return kpis.net_margin_pct if kpis.net_margin_pct is not None else 0.0


def create_action_from_recommendation(
    company_id: uuid.UUID,
    recommendation_id: uuid.UUID,
    db: Session,
    *,
    title: str | None = None,
    due_date: date | None = None,
) -> Action:
    """Crée une Action à partir d'une Recommendation existante, et capture
    immédiatement sa valeur de référence (`baseline_*`, gelée — jamais
    recalculée même si les données changent après coup, même principe que
    les rapports figés de `reports.py`).

    Fait passer la recommandation source à `"acceptee"` : créer une action
    EST la décision d'agir, on ne veut pas de deux boutons (Accepter / Créer
    une action) qui laisseraient une recommandation "nouvelle" alors qu'une
    action est déjà en cours dessus."""
    recommendation = (
        db.query(Recommendation)
        .filter(Recommendation.id == recommendation_id, Recommendation.company_id == company_id)
        .first()
    )
    if recommendation is None:
        raise RecommendationNotFoundError()

    today = datetime.now(timezone.utc).date()
    baseline_start = today - timedelta(days=MEASUREMENT_WINDOW_DAYS)
    baseline_end = today
    baseline_value = _measure(
        company_id, db, recommendation.category, baseline_start, baseline_end
    )

    action = Action(
        company_id=company_id,
        recommendation_id=recommendation.id,
        title=title or recommendation.action,
        priority=recommendation.priority,
        due_date=due_date,
        metric_category=recommendation.category,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        baseline_value=baseline_value,
    )
    db.add(action)

    recommendation.status = "acceptee"

    db.commit()
    db.refresh(action)
    return action


def measure_action_outcome(action: Action, db: Session) -> Action:
    """Calcule et persiste `outcome_*` la première fois que la fenêtre de
    suivi (`MEASUREMENT_WINDOW_DAYS` après `baseline_end`) est réellement
    écoulée. Idempotent : une fois mesurée, l'action reste gelée — appeler
    cette fonction sur une action déjà mesurée ne fait rien, ne recalcule
    jamais une deuxième fois (même principe que les rapports)."""
    if action.outcome_measured_at is not None:
        return action

    today = datetime.now(timezone.utc).date()
    outcome_start = action.baseline_end
    outcome_end = outcome_start + timedelta(days=MEASUREMENT_WINDOW_DAYS)
    if today < outcome_end:
        return action

    outcome_value = _measure(
        action.company_id, db, action.metric_category, outcome_start, outcome_end
    )
    action.outcome_start = outcome_start
    action.outcome_end = outcome_end
    action.outcome_value = outcome_value
    action.outcome_measured_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(action)
    return action
