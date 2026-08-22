import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import require_company_access
from app.database import get_db
from app.kpis import compute_category_breakdown, compute_company_kpis, compute_daily_series
from app.models import Company
from app.schemas import CategoryBreakdownItem, CompanyKpis, DailyKpiPoint

router = APIRouter(
    prefix="/companies/{company_id}",
    tags=["dashboard"],
    dependencies=[Depends(require_company_access)],
)


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.get("/kpis", response_model=CompanyKpis)
def get_company_kpis(
    company_id: uuid.UUID,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> CompanyKpis:
    """KPI calculés à partir des transactions validées uniquement (PRD section 9.3 :
    les lignes en quarantaine sont exclues des calculs de KPI tant qu'elles ne sont
    pas validées). ``start_date``/``end_date`` optionnels : sans eux, comportement
    inchangé (tout l'historique)."""
    _get_company_or_404(company_id, db)
    return compute_company_kpis(company_id, db, start_date=start_date, end_date=end_date)


@router.get("/kpis/timeseries", response_model=list[DailyKpiPoint])
def get_company_kpis_timeseries(
    company_id: uuid.UUID,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> list[DailyKpiPoint]:
    _get_company_or_404(company_id, db)
    return compute_daily_series(company_id, db, start_date=start_date, end_date=end_date)


@router.get("/kpis/categories", response_model=list[CategoryBreakdownItem])
def get_company_kpis_categories(
    company_id: uuid.UUID,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> list[CategoryBreakdownItem]:
    _get_company_or_404(company_id, db)
    return compute_category_breakdown(company_id, db, start_date=start_date, end_date=end_date)
