import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import require_company_access
from app.database import get_db
from app.models import Company, Report
from app.recommendations import sync_recommendations
from app.reports import (
    build_summary,
    generate_daily_report_content,
    generate_monthly_report_content,
    generate_weekly_report_content,
    is_period_closed,
)
from app.schemas import ReportRead

router = APIRouter(
    prefix="/companies/{company_id}/reports",
    tags=["reports"],
    dependencies=[Depends(require_company_access)],
)


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


def _find_report(company_id: uuid.UUID, report_type: str, period: date, db: Session) -> Report | None:
    return (
        db.query(Report)
        .filter(Report.company_id == company_id, Report.type == report_type, Report.period == period)
        .first()
    )


def _insert_report_or_get_existing(
    report: Report,
    company_id: uuid.UUID,
    report_type: str,
    period: date,
    db: Session,
) -> Report:
    """Insère le rapport, ou renvoie celui déjà inséré par une requête
    concurrente entre-temps (contrainte ``uq_report_company_type_period``)
    plutôt que de laisser l'``IntegrityError`` remonter en 500 (même course
    que pour les recommandations : GET sans coordination entre requêtes)."""
    db.add(report)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = _find_report(company_id, report_type, period, db)
        if existing is None:
            raise
        return existing
    db.refresh(report)
    return report


def _get_or_create_report(
    company_id: uuid.UUID,
    report_type: str,
    period: date,
    content_generator: Callable,
    db: Session,
    today: date | None = None,
) -> Report:
    """Cherche un rapport existant pour (company_id, report_type, period).

    S'il n'existe pas encore : calcule son contenu (fenêtre jusqu'à
    ``today``). Si la période est déjà terminée (cf. ``is_period_closed`` —
    toujours vrai pour un rapport quotidien), le résultat est persisté de
    façon immuable (idempotent : un seul rapport par type et par période).
    Sinon (semaine/mois en cours), le contenu à jour est retourné sans être
    persisté, pour qu'une consultation ultérieure dans la même période le
    recalcule avec des données plus fraîches plutôt que de figer une
    fenêtre partielle dès la première consultation."""
    today = today or datetime.now(timezone.utc).date()

    existing = _find_report(company_id, report_type, period, db)
    if existing is not None:
        return existing

    sync_recommendations(company_id, db)
    content = content_generator(company_id, period, db)

    if not is_period_closed(report_type, period, today):
        return Report(
            id=uuid.uuid4(),
            company_id=company_id,
            type=report_type,
            period=period,
            generated_at=datetime.now(timezone.utc),
            summary=build_summary(content),
            content=content,
        )

    report = Report(
        company_id=company_id,
        type=report_type,
        period=period,
        summary=build_summary(content),
        content=content,
    )
    return _insert_report_or_get_existing(report, company_id, report_type, period, db)


@router.get("/daily", response_model=ReportRead)
def get_daily_report(company_id: uuid.UUID, db: Session = Depends(get_db)) -> Report:
    """Retourne le rapport du jour, en le générant s'il n'existe pas encore
    (idempotent : un seul rapport « quotidien » par entreprise et par jour)."""
    _get_company_or_404(company_id, db)
    # UTC des deux côtés (cf. app/reports.py::_to_utc_date) pour éviter un
    # décalage d'un jour entre l'horloge locale du process et les timestamps
    # DB (stockés en UTC via func.now()).
    today = datetime.now(timezone.utc).date()
    return _get_or_create_report(company_id, "quotidien", today, generate_daily_report_content, db)


@router.get("/weekly", response_model=ReportRead)
def get_weekly_report(company_id: uuid.UUID, db: Session = Depends(get_db)) -> Report:
    """Retourne le rapport de la semaine ISO courante, en le générant s'il
    n'existe pas encore (idempotent : un seul rapport « hebdomadaire » par
    entreprise et par semaine ISO)."""
    _get_company_or_404(company_id, db)
    today = datetime.now(timezone.utc).date()
    # period = lundi de la semaine ISO courante (UTC).
    week_start = today - timedelta(days=today.weekday())
    return _get_or_create_report(
        company_id, "hebdomadaire", week_start, generate_weekly_report_content, db
    )


@router.get("/monthly", response_model=ReportRead)
def get_monthly_report(company_id: uuid.UUID, db: Session = Depends(get_db)) -> Report:
    """Retourne le rapport du mois civil courant, en le générant s'il
    n'existe pas encore (idempotent : un seul rapport « mensuel » par
    entreprise et par mois civil)."""
    _get_company_or_404(company_id, db)
    today = datetime.now(timezone.utc).date()
    # period = premier jour du mois civil courant (UTC).
    month_start = today.replace(day=1)
    return _get_or_create_report(
        company_id, "mensuel", month_start, generate_monthly_report_content, db
    )


@router.get("", response_model=list[ReportRead])
def list_reports(company_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Report]:
    _get_company_or_404(company_id, db)
    return (
        db.query(Report)
        .filter(Report.company_id == company_id)
        .order_by(Report.period.desc())
        .all()
    )
