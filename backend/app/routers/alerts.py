import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.alerts import Alert, alerts_from_anomalies, alerts_from_imports, sort_alerts, summarize_alerts
from app.anomalies import detect_anomalies
from app.auth import require_company_access
from app.database import get_db
from app.models import Company, Import, Transaction
from app.schemas import AlertRead, AlertSummaryItem

router = APIRouter(
    prefix="/companies/{company_id}",
    tags=["alerts"],
    dependencies=[Depends(require_company_access)],
)


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


def _compute_company_alerts(company_id: uuid.UUID, db: Session) -> list[Alert]:
    transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "validated")
        .all()
    )
    imports = db.query(Import).filter(Import.company_id == company_id).all()

    anomalies = detect_anomalies(transactions)
    return sort_alerts(alerts_from_anomalies(anomalies) + alerts_from_imports(imports))


@router.get("/alerts", response_model=list[AlertRead])
def get_company_alerts(company_id: uuid.UUID, db: Session = Depends(get_db)) -> list[AlertRead]:
    _get_company_or_404(company_id, db)
    alerts = _compute_company_alerts(company_id, db)

    return [
        AlertRead(
            level=a.level,
            title=a.title,
            message=a.message,
            source=a.source,
            source_id=a.source_id,
            category=a.category,
        )
        for a in alerts
    ]


@router.get("/alerts/summary", response_model=list[AlertSummaryItem])
def get_company_alerts_summary(
    company_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[AlertSummaryItem]:
    _get_company_or_404(company_id, db)
    alerts = _compute_company_alerts(company_id, db)
    counts = summarize_alerts(alerts)

    return [AlertSummaryItem(level=level, count=count) for level, count in counts.items()]
