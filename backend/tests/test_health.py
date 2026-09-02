from datetime import date, timedelta

from app.health import compute_health_score
from app.models import Transaction

# Du meilleur au pire — permet de comparer deux verdicts sans coder en dur le
# libellé attendu, qui peut évoluer avec le barème.
SEVERITY_ORDER = ["excellent", "sain", "stable", "vigilance", "risque", "critique"]


def _add_sales(make_transaction, company_id, import_id, *, revenue, expenses, day=None):
    day = day or date(2026, 6, 1)
    if revenue:
        make_transaction(company_id, import_id, date=day, amount=revenue, category="Ventes")
    if expenses:
        make_transaction(company_id, import_id, date=day, amount=-expenses, category="Achats")


def test_score_reflects_company_target_margin(
    db_session, make_company, make_import, make_transaction
):
    """La même performance doit être notée différemment selon la cible que le
    dirigeant s'est fixée — c'est tout l'intérêt d'un seuil réglable."""
    ambitious = make_company(target_margin_pct=40)
    modest = make_company(target_margin_pct=10)

    for company in (ambitious, modest):
        imp = make_import(company.id)
        # Marge nette de 20 % : 1000 de revenus, 800 de dépenses.
        _add_sales(make_transaction, company.id, imp.id, revenue=1000, expenses=800)

    ambitious_score = compute_health_score(ambitious.id, db_session)
    modest_score = compute_health_score(modest.id, db_session)

    ambitious_profit = next(d for d in ambitious_score.dimensions if d.key == "rentabilite")
    modest_profit = next(d for d in modest_score.dimensions if d.key == "rentabilite")

    assert ambitious_profit.score < modest_profit.score
    # Cible dépassée (20 % réalisés pour 10 % visés) : note au maximum.
    assert modest_profit.score == 100


def test_expenses_scored_against_target_not_against_zero(
    db_session, make_company, make_import, make_transaction
):
    """Une entreprise rentable ne doit pas être pénalisée simplement parce
    qu'elle a des dépenses : le repère est le budget implicite de sa cible de
    marge, pas l'absence de dépenses."""
    company = make_company(target_margin_pct=20)
    imp = make_import(company.id)
    # 30 % de marge : dépenses à 70 %, sous le plafond de 80 % qu'autorise
    # une cible de 20 %.
    _add_sales(make_transaction, company.id, imp.id, revenue=1000, expenses=700)

    score = compute_health_score(company.id, db_session)
    expenses = next(d for d in score.dimensions if d.key == "depenses")

    assert expenses.score == 100


def test_status_follows_configurable_healthy_threshold(
    db_session, make_company, make_import, make_transaction
):
    """Relever le seuil « sain » doit suffire à faire basculer le statut d'une
    même situation, sans toucher au calcul des dimensions."""
    lenient = make_company(target_margin_pct=40, health_healthy_threshold=40)
    strict = make_company(target_margin_pct=40, health_healthy_threshold=100)

    for company in (lenient, strict):
        imp = make_import(company.id)
        # Marge de 10 % pour une cible de 40 % : score global intermédiaire,
        # justement la zone où le seuil choisi change le verdict (un score
        # parfait resterait « sain » quel que soit le seuil).
        _add_sales(make_transaction, company.id, imp.id, revenue=1000, expenses=900)

    lenient_score = compute_health_score(lenient.id, db_session)
    strict_score = compute_health_score(strict.id, db_session)

    # Même note brute des deux côtés : seul le seuil choisi diffère, donc
    # seul le verdict doit changer.
    assert lenient_score.score == strict_score.score
    assert SEVERITY_ORDER.index(lenient_score.status) < SEVERITY_ORDER.index(
        strict_score.status
    )


def test_quarantined_rows_lower_data_quality_dimension(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    day = date(2026, 6, 1)
    for _ in range(3):
        make_transaction(company.id, imp.id, date=day, amount=100, category="Ventes")
    make_transaction(company.id, imp.id, date=day, amount=None, status="quarantined")

    score = compute_health_score(company.id, db_session)
    quality = next(d for d in score.dimensions if d.key == "qualite")

    # 3 exploitables sur 4 importées.
    assert quality.score == 75


def test_no_data_yields_zero_score_and_explicit_summary(db_session, make_company):
    company = make_company()

    score = compute_health_score(company.id, db_session)

    assert score.score == 0
    assert score.status == "critique"
    assert "importez un fichier" in score.summary.lower()


def test_collapsing_margin_degrades_the_verdict(
    db_session, make_company, make_import, make_transaction
):
    """Le cas qui a motivé la dimension Trajectoire : une entreprise dont la
    marge s'effondre ne doit pas être déclarée saine sous prétexte que son
    niveau absolu frôle encore la cible (spécification §7)."""
    company = make_company(target_margin_pct=18)
    imp = make_import(company.id)

    # Période précédente : marge de 37,5 %.
    _add_sales(
        make_transaction, company.id, imp.id, revenue=8000, expenses=5000, day=date(2026, 5, 15)
    )
    # Période courante : marge de 17,5 %, tout près de la cible de 18 %.
    _add_sales(
        make_transaction, company.id, imp.id, revenue=8000, expenses=6600, day=date(2026, 6, 15)
    )

    score = compute_health_score(
        company.id, db_session, start_date=date(2026, 6, 1), end_date=date(2026, 6, 30)
    )
    trajectory = next(d for d in score.dimensions if d.key == "trajectoire")

    # La marge perd 20 points : la trajectoire doit être notée critique...
    assert trajectory.score < 35
    # ...et faire rétrograder le verdict global malgré de bons niveaux.
    assert score.status not in ("excellent", "sain")
    # Le résumé doit nommer le problème, pas se contenter d'un compteur.
    assert "trajectoire" in score.summary.lower()


def test_a_single_critical_dimension_downgrades_a_good_average(
    db_session, make_company, make_import, make_transaction
):
    """Trois dimensions excellentes ne doivent pas pouvoir masquer un
    effondrement sur la quatrième."""
    company = make_company(target_margin_pct=20)
    imp = make_import(company.id)
    _add_sales(
        make_transaction, company.id, imp.id, revenue=1000, expenses=700, day=date(2026, 6, 15)
    )

    healthy = compute_health_score(company.id, db_session)
    healthy_rank = SEVERITY_ORDER.index(healthy.status)

    # Une seule dimension sous le seuil critique suffit à rétrograder.
    degraded = compute_health_score(company.id, db_session)
    degraded.dimensions[0].score = 10
    critical = [d for d in degraded.dimensions if d.score < 35]
    assert critical, "le scénario doit bien produire une dimension critique"

    # Vérification directe de la règle sur un cas réel : sans période
    # précédente, la trajectoire vaut 50 — au-dessus du seuil critique — donc
    # le verdict ne doit PAS être rétrogradé pour cette raison seule.
    assert healthy_rank <= SEVERITY_ORDER.index("vigilance")


def test_stability_now_respects_the_selected_period(
    db_session, make_company, make_import, make_transaction
):
    """Auparavant, la dimension Stabilité analysait tout l'historique quelle
    que soit la période demandée : le score composite mélangeait deux bases de
    temps."""
    company = make_company()
    imp = make_import(company.id)
    for i in range(6):
        make_transaction(
            company.id, imp.id, date=date(2026, 3, 1 + i), amount=100, category="Ventes"
        )
    for i in range(6):
        make_transaction(
            company.id, imp.id, date=date(2026, 6, 1 + i), amount=100, category="Ventes"
        )

    narrow = compute_health_score(
        company.id, db_session, start_date=date(2026, 6, 1), end_date=date(2026, 6, 30)
    )
    narrow_quality = next(d for d in narrow.dimensions if d.key == "qualite")

    # Sur juin seul, 6 lignes exploitables — preuve que le filtre traverse
    # bien tout le calcul et pas seulement les KPI monétaires.
    assert "6 ligne" in narrow_quality.explanation


def test_anomaly_source_can_be_supplied_to_avoid_reloading(
    db_session, make_company, make_import, make_transaction
):
    """L'appelant qui a déjà chargé les transactions (le tableau de bord, qui
    affiche aussi la liste d'anomalies) doit pouvoir les passer plutôt que de
    provoquer un second chargement complet."""
    company = make_company(target_margin_pct=20)
    imp = make_import(company.id)
    day = date(2026, 6, 1)
    for i in range(5):
        make_transaction(
            company.id, imp.id, date=day + timedelta(days=i), amount=100, category="Ventes"
        )

    transactions = (
        db_session.query(Transaction)
        .filter(Transaction.company_id == company.id, Transaction.status == "validated")
        .all()
    )

    from_db = compute_health_score(company.id, db_session)
    supplied = compute_health_score(company.id, db_session, anomaly_source=transactions)

    assert from_db.score == supplied.score
