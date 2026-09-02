import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query, Response
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
    response: Response,
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
) -> list[AnomalyRead]:
    """Anomalies détectées sur la période.

    Volontairement SANS `limit`/`offset`, contrairement aux autres listes
    (spec §64.24) : `detect_anomalies` plafonne déjà sa sortie à
    `MAX_ANOMALIES` (20), et ce plafond n'est pas une pagination mais une
    décision produit — au-delà, la liste cesse d'être un plan d'action et
    devient du bruit. Ajouter une pagination sur 20 éléments au maximum
    donnerait au frontend l'illusion qu'il existe une page 2, alors que le
    reste n'est pas tronqué : il n'est pas calculé. `X-Total-Count` est tout
    de même publié, pour la cohérence avec les autres listes.
    """
    company = _get_company_or_404(company_id, db)

    # Toujours l'historique complet validé : le détecteur a besoin de
    # données antérieures à `start_date` pour sa baseline statistique, c'est
    # lui (via `period_start`/`period_end`) qui scope ses résultats "recent"
    # à la période choisie, pas cette requête.
    transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "validated")
        .all()
    )

    anomalies = detect_anomalies(
        transactions,
        period_start=start_date,
        period_end=end_date,
        target_margin_pct=float(company.target_margin_pct),
    )
    # len(anomalies) <= MAX_ANOMALIES par construction (cf. docstring).
    response.headers["X-Total-Count"] = str(len(anomalies))
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
