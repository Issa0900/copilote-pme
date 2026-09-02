import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.actions import (
    RecommendationNotFoundError,
    create_action_from_recommendation,
    measure_action_outcome,
)
from app.audit import log_action_created, log_action_status_changed
from app.auth import require_company_access
from app.database import get_db
from app.models import Action, Company, User
from app.schemas import ActionCreate, ActionRead, ActionUpdate

router = APIRouter(
    prefix="/companies/{company_id}/actions",
    tags=["actions"],
    dependencies=[Depends(require_company_access)],
)

# Pagination (spec §64.24). Une action vient d'une recommandation traitée par
# un dirigeant : quelques dizaines au plus pour une entreprise active, comme
# les recommandations elles-mêmes.
DEFAULT_ACTIONS_LIMIT = 100
MAX_ACTIONS_LIMIT = 500

_STATUS_RANK = {"a_faire": 0, "en_cours": 1, "bloquee": 2, "terminee": 3, "annulee": 4}
_PRIORITY_RANK = {"urgente": 0, "élevée": 1, "moyenne": 2, "faible": 3}


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


def _result_pct(action: Action) -> float | None:
    """Variation % entre baseline et outcome — calculée à la volée, jamais
    stockée (cf. schemas.py::ActionRead)."""
    if action.outcome_value is None:
        return None
    baseline = float(action.baseline_value)
    if baseline == 0:
        return None
    return round((float(action.outcome_value) - baseline) / abs(baseline) * 100, 1)


def _to_read(action: Action) -> ActionRead:
    response = ActionRead.model_validate(action)
    response.result_pct = _result_pct(action)
    return response


@router.get("", response_model=list[ActionRead])
def list_actions(
    company_id: uuid.UUID,
    response: Response,
    limit: int = Query(DEFAULT_ACTIONS_LIMIT, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[ActionRead]:
    _get_company_or_404(company_id, db)
    limit = min(limit, MAX_ACTIONS_LIMIT)

    status_order = case(_STATUS_RANK, value=Action.status, else_=99)
    priority_order = case(_PRIORITY_RANK, value=Action.priority, else_=99)

    base = db.query(Action).filter(Action.company_id == company_id)
    response.headers["X-Total-Count"] = str(
        base.with_entities(func.count(Action.id)).scalar() or 0
    )
    actions = (
        base.order_by(status_order, priority_order, Action.created_at, Action.id)
        .limit(limit)
        .offset(offset)
        .all()
    )

    # Mesure paresseuse (spec §64.16/§64.17) : pas de tâche de fond dans ce
    # produit, la fenêtre de suivi est donc évaluée à chaque consultation de
    # la liste. `measure_action_outcome` est un no-op immédiat pour toute
    # action déjà mesurée ou dont la fenêtre n'est pas encore écoulée — coût
    # négligeable pour la poignée d'actions d'une entreprise au MVP.
    actions = [measure_action_outcome(a, db) for a in actions]
    return [_to_read(a) for a in actions]


@router.post("", response_model=ActionRead, status_code=201)
def create_action(
    company_id: uuid.UUID,
    payload: ActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_access),
) -> ActionRead:
    _get_company_or_404(company_id, db)
    try:
        action = create_action_from_recommendation(
            company_id,
            payload.recommendation_id,
            db,
            title=payload.title,
            due_date=payload.due_date,
        )
    except RecommendationNotFoundError:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")

    # Spec §64.25 : transformer une recommandation en action suivie est une
    # décision de pilotage — traçable au même titre qu'accepter/rejeter une
    # recommandation.
    log_action_created(
        current_user.id, company_id, action.id, recommendation_id=action.recommendation_id
    )
    return _to_read(action)


@router.patch("/{action_id}", response_model=ActionRead)
def update_action(
    company_id: uuid.UUID,
    action_id: uuid.UUID,
    payload: ActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_access),
) -> ActionRead:
    _get_company_or_404(company_id, db)
    action = db.get(Action, action_id)
    if action is None or action.company_id != company_id:
        raise HTTPException(status_code=404, detail="Action introuvable")

    updates = payload.model_dump(exclude_unset=True)
    previous_status = action.status
    for field, value in updates.items():
        setattr(action, field, value)
    db.commit()
    db.refresh(action)

    if "status" in updates and action.status != previous_status:
        log_action_status_changed(
            current_user.id,
            company_id,
            action_id,
            old_status=previous_status,
            new_status=action.status,
        )

    action = measure_action_outcome(action, db)
    return _to_read(action)
