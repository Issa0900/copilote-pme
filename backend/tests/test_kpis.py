from datetime import date

from app.kpis import compute_category_breakdown, compute_company_kpis


def test_compute_company_kpis_empty_company_has_zero_not_none(
    db_session, make_company
):
    company = make_company()
    kpis = compute_company_kpis(company.id, db_session)
    assert kpis.revenue_total == 0.0
    assert kpis.expenses_total == 0.0
    assert kpis.net_result == 0.0
    assert kpis.transactions_count == 0
    assert kpis.average_sale is None
    assert kpis.period_start is None
    assert kpis.period_end is None


def test_compute_company_kpis_mixed_transactions(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, amount=100, date=date(2024, 6, 1))
    make_transaction(company.id, imp.id, amount=50, date=date(2024, 6, 2))
    make_transaction(company.id, imp.id, amount=-30, date=date(2024, 6, 3))

    kpis = compute_company_kpis(company.id, db_session)
    assert kpis.revenue_total == 150.0
    assert kpis.expenses_total == 30.0
    assert kpis.net_result == 120.0
    assert kpis.transactions_count == 3
    assert kpis.average_sale == 75.0  # 150 / 2 ventes


def test_compute_company_kpis_excludes_quarantined_transactions(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, amount=100, date=date(2024, 6, 1), status="validated")
    make_transaction(company.id, imp.id, amount=9999, date=date(2024, 6, 1), status="quarantined")

    kpis = compute_company_kpis(company.id, db_session)
    assert kpis.revenue_total == 100.0
    assert kpis.transactions_count == 1
    assert kpis.quarantined_count == 1


def test_compute_category_breakdown_groups_beyond_max_categories(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    # MAX_CATEGORIES = 6 : 8 catégories distinctes doivent se regrouper sous "Autres".
    for i in range(8):
        make_transaction(
            company.id,
            imp.id,
            amount=-(10 + i),
            date=date(2024, 6, 1),
            category=f"Categorie {i}",
        )

    breakdown = compute_category_breakdown(company.id, db_session)
    assert len(breakdown) == 6
    assert breakdown[-1].category == "Autres"
