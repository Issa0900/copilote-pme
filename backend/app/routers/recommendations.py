import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.audit import log_recommendation_status_changed
from app.auth import require_company_access
from app.database import get_db
from app.models import Company, Recommendation, User
from app.recommendations import sync_recommendations
from app.schemas import RecommendationRead, RecommendationUpdate

router = APIRouter(
    prefix="/companies/{company_id}/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(require_company_access)],
)


# Pagination (spec §64.24). Les recommandations sont générées à partir des
# anomalies et des imports : quelques dizaines pour une entreprise active. Un
# défaut de 100 affiche donc la liste entière dans la quasi-totalité des cas,
# et 500 borne le pire cas (historique accumulé de recommandations traitées).
DEFAULT_RECOMMENDATIONS_LIMIT = 100
MAX_RECOMMENDATIONS_LIMIT = 500

# Ordre d'affichage : les recommandations non traitées d'abord, puis par
# urgence. Le tri est exprimé en SQL (et non plus en Python) précisément pour
# que `.limit()/.offset()` découpent la liste déjà ordonnée — paginer après un
# tri Python renverrait des pages incohérentes.
_STATUS_RANK = {"nouvelle": 0, "acceptee": 1, "rejetee": 2}
_PRIORITY_RANK = {"urgente": 0, "élevée": 1, "moyenne": 2, "faible": 3}


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.get("", response_model=list[RecommendationRead])
def list_recommendations(
    company_id: uuid.UUID,
    response: Response,
    limit: int = Query(DEFAULT_RECOMMENDATIONS_LIMIT, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[Recommendation]:
    _get_company_or_404(company_id, db)
    sync_recommendations(company_id, db)
    limit = min(limit, MAX_RECOMMENDATIONS_LIMIT)

    # `else_` au-delà des valeurs connues : un statut/priorité inattendu passe
    # en fin de liste au lieu de faire échouer la requête (l'ancien tri Python
    # levait un KeyError dans ce cas).
    status_order = case(_STATUS_RANK, value=Recommendation.status, else_=99)
    priority_order = case(_PRIORITY_RANK, value=Recommendation.priority, else_=99)

    base = db.query(Recommendation).filter(Recommendation.company_id == company_id)
    response.headers["X-Total-Count"] = str(
        base.with_entities(func.count(Recommendation.id)).scalar() or 0
    )
    return (
        base.order_by(status_order, priority_order, Recommendation.created_at, Recommendation.id)
        .limit(limit)
        .offset(offset)
        .all()
    )


@router.patch("/{recommendation_id}", response_model=RecommendationRead)
def update_recommendation(
    company_id: uuid.UUID,
    recommendation_id: uuid.UUID,
    payload: RecommendationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_access),
) -> Recommendation:
    _get_company_or_404(company_id, db)
    rec = db.get(Recommendation, recommendation_id)
    if rec is None or rec.company_id != company_id:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")

    previous_status = rec.status
    rec.status = payload.status
    db.commit()
    db.refresh(rec)
    # Spec §64.25 : accepter/rejeter une recommandation est une decision de
    # pilotage tracable — sinon on ne peut pas expliquer plus tard pourquoi
    # une alerte a disparu du tableau de bord.
    log_recommendation_status_changed(
        current_user.id,
        company_id,
        recommendation_id,
        old_status=previous_status,
        new_status=rec.status,
    )
    return rec
