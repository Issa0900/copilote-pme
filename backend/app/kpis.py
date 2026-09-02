"""Calcul des KPI d'une entreprise (PRD Module 5), à partir des transactions
validées uniquement (PRD section 9.3 : la quarantaine est exclue des KPI)."""

import uuid
from datetime import date as date_type

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models import Transaction
from app.schemas import CategoryBreakdownItem, CompanyKpis, DailyKpiPoint

MAX_CATEGORIES = 6


def _date_range_filters(
    start_date: date_type | None, end_date: date_type | None
) -> list:
    """Filtres optionnels de plage de dates, réutilisés par les 3 fonctions
    ci-dessous. ``None`` (défaut) = pas de filtre, comportement historique
    inchangé (tout-l'historique) — le filtrage par période est additif."""
    filters: list = []
    if start_date is not None:
        filters.append(Transaction.date >= start_date)
    if end_date is not None:
        filters.append(Transaction.date <= end_date)
    return filters


def compute_company_kpis(
    company_id: uuid.UUID,
    db: Session,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> CompanyKpis:
    date_filters = _date_range_filters(start_date, end_date)
    validated = [
        Transaction.company_id == company_id,
        Transaction.status == "validated",
        *date_filters,
    ]

    # Une seule passe sur la table plutôt que six requêtes séparées : chaque
    # agrégat est isolé par un CASE conditionnel, et la quarantaine (qui ne
    # partage pas le filtre `status == validated`) est comptée via un CASE sur
    # la ligne complète. Même résultat, un aller-retour au lieu de six.
    is_validated = Transaction.status == "validated"
    revenue_expr = case((is_validated & (Transaction.amount > 0), Transaction.amount), else_=0)
    expense_expr = case((is_validated & (Transaction.amount < 0), -Transaction.amount), else_=0)
    sales_count_expr = case((is_validated & (Transaction.amount > 0), 1), else_=0)
    validated_count_expr = case((is_validated, 1), else_=0)
    quarantined_expr = case((Transaction.status == "quarantined", 1), else_=0)
    validated_date_expr = case((is_validated, Transaction.date), else_=None)

    row = (
        db.query(
            func.coalesce(func.sum(revenue_expr), 0).label("revenue_total"),
            func.coalesce(func.sum(expense_expr), 0).label("expenses_total"),
            func.coalesce(func.sum(sales_count_expr), 0).label("sales_count"),
            func.coalesce(func.sum(validated_count_expr), 0).label("transactions_count"),
            func.coalesce(func.sum(quarantined_expr), 0).label("quarantined_count"),
            func.min(validated_date_expr).label("period_start"),
            func.max(validated_date_expr).label("period_end"),
        )
        .filter(Transaction.company_id == company_id, *date_filters)
        .one()
    )

    revenue_total = float(row.revenue_total)
    expenses_total = float(row.expenses_total)
    sales_count = int(row.sales_count)
    transactions_count = int(row.transactions_count)
    quarantined_count = int(row.quarantined_count)
    period_start, period_end = row.period_start, row.period_end

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


def compute_daily_series(
    company_id: uuid.UUID,
    db: Session,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> list[DailyKpiPoint]:
    """Résultat net, revenus et dépenses par jour, transactions validées
    uniquement. Les trois valeurs viennent de la même requête groupée : le net
    reste la somme signée, les revenus la somme des montants positifs et les
    dépenses la valeur absolue des montants négatifs — cohérent avec
    `compute_company_kpis`, qui applique exactement la même convention."""
    positive = case((Transaction.amount > 0, Transaction.amount), else_=0)
    negative = case((Transaction.amount < 0, -Transaction.amount), else_=0)

    rows = (
        db.query(
            Transaction.date,
            func.coalesce(func.sum(Transaction.amount), 0).label("net"),
            func.coalesce(func.sum(positive), 0).label("revenue"),
            func.coalesce(func.sum(negative), 0).label("expenses"),
        )
        .filter(
            Transaction.company_id == company_id,
            Transaction.status == "validated",
            Transaction.date.isnot(None),
            *_date_range_filters(start_date, end_date),
        )
        .group_by(Transaction.date)
        .order_by(Transaction.date)
        .all()
    )
    return [
        DailyKpiPoint(
            date=row.date,
            net=float(row.net),
            revenue=float(row.revenue),
            expenses=float(row.expenses),
        )
        for row in rows
    ]


def compute_category_breakdown(
    company_id: uuid.UUID,
    db: Session,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
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
            *_date_range_filters(start_date, end_date),
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
