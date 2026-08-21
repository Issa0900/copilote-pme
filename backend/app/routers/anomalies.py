import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.anomalies import detect_anomalies
from app.auth import require_company_access
from app.database import get_db
from app.models import Company, Transaction
from app.schemas import AnomalyRead

router = APIRouter(
    prefix="/companies/{company_id}",
    tags=["anomalies"],
    dependencies=[Depends(require_company_access)],
)


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.get("/anomalies", response_model=list[AnomalyRead])
def get_company_anomalies(
    company_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[AnomalyRead]:
    _get_company_or_404(company_id, db)

    transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "validated")
        .all()
    )

    anomalies = detect_anomalies(transactions)
    return [
        AnomalyRead(
            type=a.type,
            severity=a.severity,
            message=a.message,
            category=a.category,
            transaction_id=a.transaction_id,
            detected_at=a.detected_at,
        )
        for a in anomalies
    ]
