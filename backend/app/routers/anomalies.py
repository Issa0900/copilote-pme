import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
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
    company_id: uuid.UUID,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> list[AnomalyRead]:
    _get_company_or_404(company_id, db)

    # Toujours l'historique complet validé : le détecteur a besoin de
    # données antérieures à `start_date` pour sa baseline statistique, c'est
    # lui (via `period_start`/`period_end`) qui scope ses résultats "recent"
    # à la période choisie, pas cette requête.
    transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "validated")
        .all()
    )

    anomalies = detect_anomalies(transactions, period_start=start_date, period_end=end_date)
    return [
        AnomalyRead(
            type=a.type,
            severity=a.severity,
            message=a.message,
            category=a.category,
            transaction_id=a.transaction_id,
            detected_at=a.detected_at,
            why=a.why,
            impact_amount=a.impact_amount,
            action=a.action,
        )
        for a in anomalies
    ]
