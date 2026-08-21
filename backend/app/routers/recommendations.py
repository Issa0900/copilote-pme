import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_company_access
from app.database import get_db
from app.models import Company, Recommendation
from app.recommendations import sync_recommendations
from app.schemas import RecommendationRead, RecommendationUpdate

router = APIRouter(
    prefix="/companies/{company_id}/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(require_company_access)],
)


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.get("", response_model=list[RecommendationRead])
def list_recommendations(
    company_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[Recommendation]:
    _get_company_or_404(company_id, db)
    sync_recommendations(company_id, db)

    priority_rank = {"urgente": 0, "élevée": 1, "moyenne": 2, "faible": 3}
    status_rank = {"nouvelle": 0, "acceptee": 1, "rejetee": 2}
    recs = db.query(Recommendation).filter(Recommendation.company_id == company_id).all()
    return sorted(
        recs, key=lambda r: (status_rank[r.status], priority_rank[r.priority])
    )


@router.patch("/{recommendation_id}", response_model=RecommendationRead)
def update_recommendation(
    company_id: uuid.UUID,
    recommendation_id: uuid.UUID,
    payload: RecommendationUpdate,
    db: Session = Depends(get_db),
) -> Recommendation:
    _get_company_or_404(company_id, db)
    rec = db.get(Recommendation, recommendation_id)
    if rec is None or rec.company_id != company_id:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")

    rec.status = payload.status
    db.commit()
    db.refresh(rec)
    return rec
