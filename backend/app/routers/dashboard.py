import uuid
from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import require_company_access
from app.database import get_db
from app.health import compute_health_score
from app.kpis import compute_category_breakdown, compute_company_kpis, compute_daily_series
from app.models import Company
from app.schemas import (
    CategoryBreakdownItem,
    CompanyKpis,
    DailyKpiPoint,
    HealthScore,
    KpiComparison,
    KpiVariance,
)
from app.variance import compute_kpi_variance

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


@router.get("/kpis/comparison", response_model=KpiComparison)
def get_company_kpis_comparison(
    company_id: uuid.UUID,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> KpiComparison:
    """KPI de la période demandée, plus ceux de la période précédente de même
    durée — c'est cette seconde série qui permet d'afficher « vs période
    précédente » sans inventer de variation.

    Sans plage de dates (vue « tout l'historique »), il n'existe pas de
    période précédente comparable : ``previous`` vaut alors None, et le
    tableau de bord n'affiche simplement aucune variation."""
    _get_company_or_404(company_id, db)
    current = compute_company_kpis(company_id, db, start_date=start_date, end_date=end_date)

    if start_date is None or end_date is None:
        return KpiComparison(current=current, previous=None)

    # Période précédente immédiatement contiguë, de durée identique : pour une
    # plage du 1er au 30, la précédente va du 2e mois-1 au 31 du mois d'avant.
    span = end_date - start_date
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - span
    previous = compute_company_kpis(
        company_id, db, start_date=previous_start, end_date=previous_end
    )
    return KpiComparison(current=current, previous=previous)


@router.get("/kpis/variance", response_model=list[KpiVariance])
def get_company_kpis_variance(
    company_id: uuid.UUID,
    start_date: date_type = Query(...),
    end_date: date_type = Query(...),
    db: Session = Depends(get_db),
) -> list[KpiVariance]:
    """Analyse d'écarts : ce qui explique le mouvement des revenus et des
    dépenses entre la période demandée et la précédente, décomposé par
    catégorie.

    La plage de dates est obligatoire ici (contrairement aux autres routes du
    tableau de bord) : un écart suppose deux périodes comparables, il n'y a
    rien à analyser sur « tout l'historique »."""
    _get_company_or_404(company_id, db)

    span = end_date - start_date
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - span

    return [
        compute_kpi_variance(
            company_id, db, metric, start_date, end_date, previous_start, previous_end
        )
        for metric in ("revenue", "expenses")
    ]


@router.get("/health-score", response_model=HealthScore)
def get_company_health_score(
    company_id: uuid.UUID,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> HealthScore:
    """Score de santé global (0-100) et ses dimensions, chacune accompagnée de
    l'explication de sa note — le score ne doit jamais être opaque."""
    _get_company_or_404(company_id, db)
    return compute_health_score(company_id, db, start_date=start_date, end_date=end_date)


@router.get("/kpis/categories", response_model=list[CategoryBreakdownItem])
def get_company_kpis_categories(
    company_id: uuid.UUID,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> list[CategoryBreakdownItem]:
    _get_company_or_404(company_id, db)
    return compute_category_breakdown(company_id, db, start_date=start_date, end_date=end_date)
