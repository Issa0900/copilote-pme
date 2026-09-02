"""Calcul des KPI d'une entreprise (PRD Module 5), à partir des transactions
validées uniquement (PRD section 9.3 : la quarantaine est exclue des KPI)."""

import uuid
from datetime import date as date_type

from sqlalchemy import and_, case, func, true
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
    # `in_period` vaut `True` (donc neutre) si aucune borne n'est fournie —
    # `and_(*[])` s'évalue à `True` en SQLAlchemy. Il ne filtre QUE les
    # agrégats qui doivent honorer la période choisie à l'écran ; la
    # quarantaine sans date (ci-dessous) reste volontairement en dehors de
    # cette règle.
    in_period = and_(true(), *_date_range_filters(start_date, end_date))

    # Une seule passe sur la table plutôt que six requêtes séparées : chaque
    # agrégat est isolé par un CASE conditionnel, et la quarantaine (qui ne
    # partage pas le filtre `status == validated`) est comptée via un CASE sur
    # la ligne complète. Même résultat, un aller-retour au lieu de six.
    is_validated = Transaction.status == "validated"
    is_validated_in_period = is_validated & in_period
    revenue_expr = case(
        (is_validated_in_period & (Transaction.amount > 0), Transaction.amount), else_=0
    )
    expense_expr = case(
        (is_validated_in_period & (Transaction.amount < 0), -Transaction.amount), else_=0
    )
    sales_count_expr = case((is_validated_in_period & (Transaction.amount > 0), 1), else_=0)
    validated_count_expr = case((is_validated_in_period, 1), else_=0)
    # Une ligne en quarantaine avec une vraie date respecte le filtre de
    # période choisi (cohérence avec le reste de l'écran) ; une ligne en
    # quarantaine SANS date (précisément le cas qui l'a fait quarantiner)
    # reste comptée quel que soit le filtre — sinon elle disparaît sous
    # n'importe quelle période et la qualité des données paraît meilleure
    # qu'elle ne l'est.
    is_quarantined = Transaction.status == "quarantined"
    quarantined_expr = case(
        (is_quarantined & (in_period | Transaction.date.is_(None)), 1), else_=0
    )
    validated_date_expr = case((is_validated_in_period, Transaction.date), else_=None)

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
        .filter(Transaction.company_id == company_id)
        .one()
    )

    revenue_total = float(row.revenue_total)
    expenses_total = float(row.expenses_total)
    sales_count = int(row.sales_count)
    transactions_count = int(row.transactions_count)
    quarantined_count = int(row.quarantined_count)
    period_start, period_end = row.period_start, row.period_end

    net_result = revenue_total - expenses_total

    # Marge nette : pur calcul Python sur des valeurs DÉJÀ agrégées ci-dessus —
    # aucune requête supplémentaire, la règle « une seule requête » tient.
    # Division par zéro (spec §64.8) : sans revenu, la marge n'est pas 0 %,
    # elle n'existe pas — on renvoie None et c'est à l'affichage de dire
    # « non calculable » plutôt que d'annoncer un 0 % faux.
    # Arrondi à 1 décimale, cohérent avec les autres pourcentages du backend
    # (`variance.py` arrondit `delta_pct` et `share_of_change_pct` à 1
    # décimale ; les montants, eux, sont à 2). C'est aussi la précision déjà
    # affichée à l'écran, donc le backend n'expose pas plus de chiffres
    # significatifs que le calcul n'en supporte.
    net_margin_pct = round((net_result / revenue_total) * 100, 1) if revenue_total else None

    return CompanyKpis(
        revenue_total=revenue_total,
        expenses_total=expenses_total,
        net_result=net_result,
        net_margin_pct=net_margin_pct,
        transactions_count=transactions_count,
        # Panier moyen : spec §14 le définit comme CA / nombre de commandes.
        # Le modèle n'a pas d'entité « commande » — une transaction n'est pas
        # forcément une commande, et une commande peut être fractionnée en
        # plusieurs transactions selon la source d'import. Faute de mieux, on
        # approxime avec `revenue_total / sales_count` (nombre de lignes à
        # montant positif), ce qui compte à tort comme « vente » toute ligne
        # positive : remboursement, dépôt, subvention... Inventer une liste de
        # catégories « non-vente » pour filtrer ces cas serait fragile (aucun
        # synonyme de valeur de catégorie n'existe dans `ingestion.py`, et une
        # vraie vente homonyme serait mal classée) — non fait ici,
        # volontairement. Cette estimation mélange aussi des paniers de
        # nature très différente (comptoir ~45 $, en ligne ~120 $,
        # traiteur ~450 $ dans les données démo) : le chiffre ne décrit donc
        # aucune transaction réelle, seulement une moyenne globale.
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
    """Total absolu par catégorie, DÉPENSES UNIQUEMENT (transactions validées
    à montant négatif), affiché en valeur absolue. Le frontend
    (`category-breakdown.tsx`) annonce explicitement « Répartition des
    dépenses par catégorie » : mélanger des catégories de revenu (ex. « Ventes
    comptoir ») et de dépense (ex. « Loyer ») dans le même camembert rendrait
    le total central incohérent avec ce titre, donc trompeur. Les catégories
    au-delà de MAX_CATEGORIES sont regroupées sous « Autres »."""
    rows = (
        db.query(
            Transaction.category,
            func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label("total"),
        )
        .filter(
            Transaction.company_id == company_id,
            Transaction.status == "validated",
            Transaction.category.isnot(None),
            Transaction.amount < 0,
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
