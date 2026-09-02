import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.alerts import Alert, alerts_from_anomalies, alerts_from_imports, sort_alerts, summarize_alerts
from app.anomalies import default_recent_period, detect_anomalies
from app.auth import require_company_access
from app.database import get_db
from app.models import Company, Import, Transaction
from app.schemas import AlertRead, AlertSummaryItem

router = APIRouter(
    prefix="/companies/{company_id}",
    tags=["alerts"],
    dependencies=[Depends(require_company_access)],
)


# Pagination (spec §64.24). Une alerte appelle une décision : au-delà de
# quelques dizaines, la liste n'est de toute façon plus lisible. 50 par défaut
# couvre l'usage réel (le tri par gravité met le pire en tête), 200 borne le
# cas d'un import massivement en quarantaine.
DEFAULT_ALERTS_LIMIT = 50
MAX_ALERTS_LIMIT = 200


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


def _compute_company_alerts(company_id: uuid.UUID, db: Session) -> list[Alert]:
    company = _get_company_or_404(company_id, db)
    transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "validated")
        .all()
    )
    imports = db.query(Import).filter(Import.company_id == company_id).all()

    # Motifs de quarantaine par import (spec §64.13 : une alerte doit dire
    # clairement le problème, pas seulement son compte) — requête séparée des
    # transactions validées ci-dessus, `Transaction.status` filtre les deux
    # populations différemment.
    quarantined = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "quarantined")
        .all()
    )
    quarantined_by_import: dict[uuid.UUID, list[Transaction]] = {}
    for t in quarantined:
        quarantined_by_import.setdefault(t.import_id, []).append(t)

    # Même fenêtre par défaut que le tableau de bord (spec §64.32 : Alertes
    # est P0) — plus le découpage médian de tout l'historique, qui pouvait
    # faire apparaître une alerte sans équivalent visible nulle part sur le
    # Dashboard, ou l'inverse.
    period_start, period_end = default_recent_period()
    anomalies = detect_anomalies(
        transactions,
        period_start=period_start,
        period_end=period_end,
        target_margin_pct=float(company.target_margin_pct),
    )
    return sort_alerts(
        alerts_from_anomalies(anomalies)
        + alerts_from_imports(imports, quarantined_by_import)
    )


@router.get("/alerts", response_model=list[AlertRead])
def get_company_alerts(
    company_id: uuid.UUID,
    response: Response,
    limit: int = Query(DEFAULT_ALERTS_LIMIT, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[AlertRead]:
    limit = min(limit, MAX_ALERTS_LIMIT)
    # `_compute_company_alerts` fait déjà le contrôle 404 (elle a besoin de
    # `company.target_margin_pct` pour la règle "Marge" du détecteur
    # d'anomalies) — un second appel ici serait une requête DB redondante.
    alerts = _compute_company_alerts(company_id, db)

    # Découpage EN MÉMOIRE, contrairement aux listes SQL (imports, rapports,
    # recommandations) où `.limit()/.offset()` sont appliqués par la base.
    # C'est assumé et non une incohérence : les alertes ne sont pas des lignes
    # de table, elles sont dérivées des anomalies et des imports puis triées
    # par gravité en Python (`sort_alerts`). Le calcul complet doit donc avoir
    # lieu de toute façon — la pagination borne ici ce qui est SÉRIALISÉ et
    # envoyé au client, pas ce qui est calculé.
    response.headers["X-Total-Count"] = str(len(alerts))
    alerts = alerts[offset : offset + limit]

    return [
        AlertRead(
            level=a.level,
            title=a.title,
            message=a.message,
            source=a.source,
            source_id=a.source_id,
            category=a.category,
            why=a.why,
            impact_amount=a.impact_amount,
            action=a.action,
        )
        for a in alerts
    ]


@router.get("/alerts/summary", response_model=list[AlertSummaryItem])
def get_company_alerts_summary(
    company_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[AlertSummaryItem]:
    alerts = _compute_company_alerts(company_id, db)
    counts = summarize_alerts(alerts)

    return [AlertSummaryItem(level=level, count=count) for level, count in counts.items()]
