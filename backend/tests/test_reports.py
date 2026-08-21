from datetime import date

from app.models import Report
from app.reports import (
    generate_daily_report_content,
    generate_weekly_report_content,
    is_period_closed,
    period_end,
)
from app.routers.reports import _find_report, _get_or_create_report, _insert_report_or_get_existing


# --- is_period_closed / period_end -----------------------------------------


def test_period_end_weekly_is_sunday_of_same_week():
    monday = date(2024, 6, 3)
    assert period_end("hebdomadaire", monday) == date(2024, 6, 9)


def test_period_end_monthly_is_last_day_of_month():
    assert period_end("mensuel", date(2024, 2, 1)) == date(2024, 2, 29)  # année bissextile
    assert period_end("mensuel", date(2024, 12, 1)) == date(2024, 12, 31)


def test_is_period_closed_daily_always_true():
    today = date(2024, 6, 3)
    assert is_period_closed("quotidien", today, today) is True


def test_is_period_closed_weekly_false_mid_week():
    monday = date(2024, 6, 3)
    wednesday = date(2024, 6, 5)
    assert is_period_closed("hebdomadaire", monday, wednesday) is False


def test_is_period_closed_weekly_false_on_last_day():
    # Le dimanche est encore dans la semaine : pas encore "figeable" avant
    # le lundi suivant (cf. docstring is_period_closed).
    monday = date(2024, 6, 3)
    sunday = date(2024, 6, 9)
    assert is_period_closed("hebdomadaire", monday, sunday) is False


def test_is_period_closed_weekly_true_following_monday():
    monday = date(2024, 6, 3)
    following_monday = date(2024, 6, 10)
    assert is_period_closed("hebdomadaire", monday, following_monday) is True


# --- race condition : insertion concurrente de rapports ---------------------


def test_insert_report_or_get_existing_returns_concurrent_row_on_conflict(
    db_session, make_company
):
    # Régression : deux requêtes GET concurrentes constatent toutes les deux
    # qu'aucun rapport n'existe encore pour (company, type, period) et
    # tentent de l'insérer -> viole uq_report_company_type_period. On simule
    # la ligne "concurrente" déjà commitée puis on tente d'insérer un
    # doublon pour la même période.
    company = make_company()
    period = date(2024, 6, 3)

    concurrent = Report(
        company_id=company.id,
        type="hebdomadaire",
        period=period,
        summary="résumé concurrent",
        content={"v": 1},
    )
    db_session.add(concurrent)
    db_session.commit()  # simule une requête concurrente déjà commitée

    duplicate = Report(
        company_id=company.id,
        type="hebdomadaire",
        period=period,
        summary="résumé en conflit",
        content={"v": 2},
    )

    result = _insert_report_or_get_existing(
        duplicate, company.id, "hebdomadaire", period, db_session
    )

    # La version déjà commitée par la requête concurrente est retournée,
    # pas de 500, pas de doublon en base.
    assert result.id == concurrent.id
    assert result.summary == "résumé concurrent"
    stored = (
        db_session.query(Report)
        .filter(Report.company_id == company.id, Report.type == "hebdomadaire")
        .all()
    )
    assert len(stored) == 1


# --- fenêtre de calcul hebdo/mensuelle : figée seulement après la période --


def test_weekly_report_not_persisted_before_period_ends(db_session, make_company):
    company = make_company()
    monday = date(2024, 6, 3)
    wednesday = date(2024, 6, 5)  # semaine en cours

    report = _get_or_create_report(
        company.id,
        "hebdomadaire",
        monday,
        generate_weekly_report_content,
        db_session,
        today=wednesday,
    )

    assert report.period == monday
    stored = _find_report(company.id, "hebdomadaire", monday, db_session)
    assert stored is None  # pas persisté : recalculé à chaque consultation


def test_weekly_report_recomputed_on_each_call_before_period_ends(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    monday = date(2024, 6, 3)
    imp = make_import(company.id)

    first = _get_or_create_report(
        company.id,
        "hebdomadaire",
        monday,
        generate_weekly_report_content,
        db_session,
        today=date(2024, 6, 3),
    )
    assert first.content["performance"]["transactions_validees"] == 0

    make_transaction(company.id, imp.id, amount=100, date=date(2024, 6, 4))

    second = _get_or_create_report(
        company.id,
        "hebdomadaire",
        monday,
        generate_weekly_report_content,
        db_session,
        today=date(2024, 6, 5),
    )
    # Contenu recalculé avec la transaction ajoutée entre-temps : pas figé
    # sur le premier instantané.
    assert second.content["performance"]["transactions_validees"] == 1


def test_weekly_report_persisted_once_period_has_ended(db_session, make_company):
    company = make_company()
    monday = date(2024, 6, 3)
    following_monday = date(2024, 6, 10)

    report = _get_or_create_report(
        company.id,
        "hebdomadaire",
        monday,
        generate_weekly_report_content,
        db_session,
        today=following_monday,
    )

    stored = _find_report(company.id, "hebdomadaire", monday, db_session)
    assert stored is not None
    assert stored.id == report.id

    # Deuxième appel : le rapport figé est retourné tel quel, pas recalculé.
    again = _get_or_create_report(
        company.id,
        "hebdomadaire",
        monday,
        generate_weekly_report_content,
        db_session,
        today=date(2024, 7, 1),
    )
    assert again.id == report.id


def test_daily_report_still_persisted_immediately(db_session, make_company):
    # Le rapport quotidien n'est pas concerné par le changement de fenêtre
    # (sa période = un seul jour, déjà correcte par construction).
    company = make_company()
    today = date(2024, 6, 3)

    report = _get_or_create_report(
        company.id, "quotidien", today, generate_daily_report_content, db_session, today=today
    )

    stored = _find_report(company.id, "quotidien", today, db_session)
    assert stored is not None
    assert stored.id == report.id
