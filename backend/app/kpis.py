"""Calcul des KPI d'une entreprise (PRD Module 5), à partir des transactions
validées uniquement (PRD section 9.3 : la quarantaine est exclue des KPI)."""

import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Transaction
from app.schemas import CategoryBreakdownItem, CompanyKpis, DailyKpiPoint

MAX_CATEGORIES = 6


def compute_company_kpis(company_id: uuid.UUID, db: Session) -> CompanyKpis:
    validated = Transaction.company_id == company_id, Transaction.status == "validated"

    revenue_total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(*validated, Transaction.amount > 0)
        .scalar()
    )
    expenses_total = (
        db.query(func.coalesce(func.sum(-Transaction.amount), 0))
        .filter(*validated, Transaction.amount < 0)
        .scalar()
    )
    sales_count = (
        db.query(func.count(Transaction.id))
        .filter(*validated, Transaction.amount > 0)
        .scalar()
    )
    transactions_count = db.query(func.count(Transaction.id)).filter(*validated).scalar()
    quarantined_count = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.company_id == company_id, Transaction.status == "quarantined")
        .scalar()
    )
    period_start, period_end = (
        db.query(func.min(Transaction.date), func.max(Transaction.date))
        .filter(*validated)
        .one()
    )

    revenue_total = float(revenue_total)
    expenses_total = float(expenses_total)

    return CompanyKpis(
        revenue_total=revenue_total,
        expenses_total=expenses_total,
        net_result=revenue_total - expenses_total,
        transactions_count=transactions_count,
        average_sale=(revenue_total / sales_count) if sales_count else None,
        quarantined_count=quarantined_count,
        period_start=period_start,
        period_end=period_end,
    )


def compute_daily_series(company_id: uuid.UUID, db: Session) -> list[DailyKpiPoint]:
    """Résultat net par jour, transactions validées uniquement."""
    rows = (
        db.query(
            Transaction.date,
            func.coalesce(func.sum(Transaction.amount), 0).label("net"),
        )
        .filter(
            Transaction.company_id == company_id,
            Transaction.status == "validated",
            Transaction.date.isnot(None),
        )
        .group_by(Transaction.date)
        .order_by(Transaction.date)
        .all()
    )
    return [DailyKpiPoint(date=row.date, net=float(row.net)) for row in rows]


def compute_category_breakdown(
    company_id: uuid.UUID, db: Session
) -> list[CategoryBreakdownItem]:
    """Total absolu par catégorie, transactions validées uniquement. Les
    catégories au-delà de MAX_CATEGORIES sont regroupées sous « Autres »."""
    rows = (
        db.query(
            Transaction.category,
            func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label("total"),
        )
        .filter(
            Transaction.company_id == company_id,
            Transaction.status == "validated",
            Transaction.category.isnot(None),
        )
        .group_by(Transaction.category)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .all()
    )

    items = [
        CategoryBreakdownItem(category=row.category, total=float(row.total))
        for row in rows
    ]

    if len(items) <= MAX_CATEGORIES:
        return items

    head = items[: MAX_CATEGORIES - 1]
    other_total = sum(item.total for item in items[MAX_CATEGORIES - 1 :])
    head.append(CategoryBreakdownItem(category="Autres", total=other_total))
    return head
