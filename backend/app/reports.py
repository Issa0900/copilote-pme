"""Rapports quotidien, hebdomadaire et mensuel (PRD Module 23).

Assemble un instantané figé (snapshot JSON) à partir des modules déjà
construits : KPI (Module 5), anomalies (Module 7) et recommandations
(Module 19). Un rapport est généré au plus une fois par entreprise et par
période — quotidienne, hebdomadaire (semaine ISO) ou mensuelle (mois civil)
— (idempotent) — le contenu est gelé au moment de la génération, il ne se
recalcule pas rétroactivement si les données changent ensuite.

Sections du PRD non couvertes, faute de module source réel : Opportunités
(Module 17, non construit), Actualités pertinentes (Module 8 — radar
externe, non construit), Automatisations (Module 21, non construit). Elles
apparaissent vides avec une note explicite plutôt que d'être fabriquées,
quel que soit le type de rapport.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.anomalies import DEFAULT_TARGET_MARGIN_PCT, detect_anomalies
from app.kpis import compute_company_kpis
from app.models import Company, Import, Recommendation, Transaction

PRIORITY_RANK = {"urgente": 0, "élevée": 1, "moyenne": 2, "faible": 3}
TOP_RISKS_COUNT = 5
TOP_ACTIONS_COUNT = 5


def _to_utc_date(value: datetime) -> date:
    """Normalise un timestamp (naïf ou avec fuseau) en date calendaire UTC.

    ``Import.uploaded_at`` vient de ``func.now()`` côté PostgreSQL (UTC) mais
    peut revenir du driver avec un ``tzinfo`` différent de UTC selon le
    fuseau de session ; on convertit explicitement avant d'extraire la date
    pour éviter tout décalage d'un jour par rapport à ``period``.
    """
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).date()
    return value.date()


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def period_end(report_type: str, period: date) -> date:
    """Dernier jour calendaire de la période (inclus).

    Pour un rapport quotidien, la période est déjà un jour unique."""
    if report_type == "hebdomadaire":
        return period + timedelta(days=6)
    if report_type == "mensuel":
        if period.month == 12:
            next_month_start = period.replace(year=period.year + 1, month=1, day=1)
        else:
            next_month_start = period.replace(month=period.month + 1, day=1)
        return next_month_start - timedelta(days=1)
    return period


def is_period_closed(report_type: str, period: date, today: date) -> bool:
    """Une période hebdomadaire/mensuelle n'est « figeable » (persistable de
    façon immuable) qu'une fois entièrement écoulée — le lundi suivant pour
    un rapport hebdomadaire, le 1er du mois suivant pour un rapport mensuel.
    Consultée avant cette date, la fenêtre de calcul est nécessairement
    partielle (elle s'arrête à ``today``) : la figer prématurément
    reviendrait à montrer indéfiniment les données du premier jour de
    consultation. Le rapport quotidien est toujours considéré clos : sa
    période est déjà un jour unique, ce n'est pas concerné par ce problème.
    """
    if report_type == "quotidien":
        return True
    return today > period_end(report_type, period)


def _build_resume(
    company_id: uuid.UUID,
    window_start: date,
    window_end: date,
    db: Session,
    kpis,
    period_label: str,
) -> dict:
    company_imports = db.query(Import).filter(Import.company_id == company_id).all()
    period_imports = [
        imp
        for imp in company_imports
        if window_start <= _to_utc_date(imp.uploaded_at) <= window_end
    ]

    evenements = [
        (
            f"Import « {imp.file_name} » : {imp.rows_processed} ligne(s), "
            f"{imp.rows_quarantined} en attente de vérification"
            if imp.status != "echoue"
            else f"Import « {imp.file_name} » échoué : {imp.error_message or 'raison inconnue'}"
        )
        for imp in period_imports
    ]
    if not evenements:
        evenements = [f"Aucun import {period_label}."]

    if kpis.transactions_count == 0:
        etat_general = "Aucune donnée validée pour l'instant."
    elif kpis.net_result >= 0:
        etat_general = f"Résultat net positif de {kpis.net_result:.2f} $ sur la période disponible."
    else:
        etat_general = f"Résultat net négatif de {kpis.net_result:.2f} $ sur la période disponible."

    return {"etat_general": etat_general, "evenements_importants": evenements}


def _generate_report_content(
    company_id: uuid.UUID,
    window_start: date,
    window_end: date,
    period_label: str,
    db: Session,
) -> dict:
    kpis = compute_company_kpis(company_id, db, start_date=window_start, end_date=window_end)

    transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.status == "validated")
        .all()
    )
    company = db.get(Company, company_id)
    target_margin_pct = (
        float(company.target_margin_pct)
        if company is not None and company.target_margin_pct
        else DEFAULT_TARGET_MARGIN_PCT
    )
    anomalies = detect_anomalies(transactions, target_margin_pct=target_margin_pct)

    recs = (
        db.query(Recommendation)
        .filter(Recommendation.company_id == company_id, Recommendation.status == "nouvelle")
        .all()
    )
    recs = sorted(recs, key=lambda r: PRIORITY_RANK.get(r.priority, 9))

    # `analysis`/`impact`/`action` en plus de `situation`/`priority` : un
    # rapport est un instantané figé censé se lire seul (docstring du
    # module), il ne doit pas constater un risque sans dire pourquoi ni quoi
    # faire — ces champs existent déjà sur `Recommendation`, ils étaient
    # simplement laissés de côté ici.
    top_risks = [
        {
            "situation": r.situation,
            "priority": r.priority,
            "analysis": r.analysis,
            "impact": r.impact,
            "action": r.action,
        }
        for r in recs[:TOP_RISKS_COUNT]
    ]
    top_actions = [r.action for r in recs[:TOP_ACTIONS_COUNT]]

    return {
        "resume": _build_resume(company_id, window_start, window_end, db, kpis, period_label),
        "performance": {
            "revenus": kpis.revenue_total,
            "depenses": kpis.expenses_total,
            "resultat_net": kpis.net_result,
            "transactions_validees": kpis.transactions_count,
            "panier_moyen": kpis.average_sale,
        },
        "risques": top_risks,
        "opportunites": {
            "items": [],
            "note": "Aucune opportunité identifiée pour l'instant.",
        },
        "actualites": {
            "items": [],
            "note": "Aucune actualité pertinente pour l'instant.",
        },
        "actions": top_actions,
        "automatisations": {
            "items": [],
            "note": "Aucune automatisation configurée pour l'instant.",
        },
        "anomalies_count": len(anomalies),
    }


def generate_daily_report_content(company_id: uuid.UUID, period: date, db: Session) -> dict:
    return _generate_report_content(company_id, period, period, "aujourd'hui", db)


def generate_weekly_report_content(company_id: uuid.UUID, period: date, db: Session) -> dict:
    return _generate_report_content(company_id, period, _today_utc(), "cette semaine", db)


def generate_monthly_report_content(company_id: uuid.UUID, period: date, db: Session) -> dict:
    return _generate_report_content(company_id, period, _today_utc(), "ce mois-ci", db)


def build_summary(content: dict) -> str:
    return content["resume"]["etat_general"]
