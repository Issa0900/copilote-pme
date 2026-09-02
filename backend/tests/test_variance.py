from datetime import date

from app.variance import compute_kpi_variance

CURRENT = (date(2026, 6, 1), date(2026, 6, 30))
PREVIOUS = (date(2026, 5, 2), date(2026, 5, 31))


def _variance(db_session, company, metric):
    return compute_kpi_variance(company.id, db_session, metric, *CURRENT, *PREVIOUS)


def test_identifies_the_category_driving_a_rise(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    # Fournitures triple, le reste ne bouge pas : la hausse doit lui être
    # imputée sans ambiguïté.
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-100, category="Fournitures")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-400, category="Fournitures")
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-200, category="Loyer")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-200, category="Loyer")

    result = _variance(db_session, company, "expenses")

    assert result.previous == 300
    assert result.current == 600
    assert result.delta == 300
    assert result.contributors[0].category == "Fournitures"
    assert result.contributors[0].share_of_change_pct == 100.0


def test_share_exceeds_100_percent_when_offset_elsewhere(
    db_session, make_company, make_import, make_transaction
):
    """Une hausse partiellement compensée doit rester visible : c'est
    précisément le cas où un simple « +10 % de dépenses » cache un mouvement
    beaucoup plus important sur une catégorie."""
    company = make_company()
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-100, category="Fournitures")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-500, category="Fournitures")
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-300, category="Marketing")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-100, category="Marketing")

    result = _variance(db_session, company, "expenses")

    # Écart net : 600 - 400 = 200. Fournitures pèse +400, soit 200 % de l'écart.
    assert result.delta == 200
    top = result.contributors[0]
    assert top.category == "Fournitures"
    assert top.share_of_change_pct == 200.0
    # Marketing compense, sa part est négative.
    offset = next(c for c in result.contributors if c.category == "Marketing")
    assert offset.share_of_change_pct < 0


def test_revenue_and_expenses_are_separated(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=1000, category="Ventes")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=1500, category="Ventes")
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-400, category="Achats")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-100, category="Achats")

    revenue = _variance(db_session, company, "revenue")
    expenses = _variance(db_session, company, "expenses")

    assert revenue.delta == 500
    assert revenue.contributors[0].category == "Ventes"
    # Les dépenses baissent : l'écart est négatif, et n'emprunte rien aux ventes.
    assert expenses.delta == -300
    assert {c.category for c in expenses.contributors} == {"Achats"}


def test_marginal_categories_are_filtered_out(
    db_session, make_company, make_import, make_transaction
):
    """Une catégorie qui ne pèse presque rien dans le mouvement n'explique
    rien : la lister diluerait les vrais facteurs."""
    company = make_company()
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-1000, category="Gros")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-2000, category="Gros")
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-100, category="Broutille")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-110, category="Broutille")

    result = _variance(db_session, company, "expenses")

    categories = {c.category for c in result.contributors}
    assert "Gros" in categories
    assert "Broutille" not in categories


def test_no_change_yields_no_contributors(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-500, category="Loyer")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-500, category="Loyer")

    result = _variance(db_session, company, "expenses")

    assert result.delta == 0
    assert result.contributors == []


def test_quarantined_rows_excluded_from_variance(
    db_session, make_company, make_import, make_transaction
):
    """Cohérent avec les KPI : une ligne en quarantaine ne doit jamais peser
    dans une explication d'écart, sinon le total expliqué ne correspondrait
    plus au chiffre affiché."""
    company = make_company()
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, date=date(2026, 5, 10), amount=-100, category="Achats")
    make_transaction(company.id, imp.id, date=date(2026, 6, 10), amount=-200, category="Achats")
    make_transaction(
        company.id,
        imp.id,
        date=date(2026, 6, 10),
        amount=-9999,
        category="Achats",
        status="quarantined",
    )

    result = _variance(db_session, company, "expenses")

    assert result.current == 200
    assert result.delta == 100
