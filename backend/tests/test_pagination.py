"""Pagination des listes (spec §64.24).

Contrat volontairement conservé : la réponse reste un TABLEAU JSON (le
frontend consomme déjà ces routes comme des listes), la pagination passe par
les paramètres `limit`/`offset` et le total réel par l'en-tête
`X-Total-Count`.
"""

from datetime import date, timedelta

from app.models import Report


# --- GET /companies/{id}/imports ---------------------------------------------


def test_list_imports_limit_and_offset_slice_without_overlap(
    authed_client, make_import, db_session
):
    client, _, company = authed_client
    for i in range(5):
        make_import(company.id, file_name=f"import-{i}.csv")
    db_session.flush()

    first = client.get(f"/companies/{company.id}/imports?limit=2")
    second = client.get(f"/companies/{company.id}/imports?limit=2&offset=2")

    assert len(first.json()) == 2
    assert len(second.json()) == 2
    ids_first = {row["id"] for row in first.json()}
    ids_second = {row["id"] for row in second.json()}
    assert ids_first.isdisjoint(ids_second)

    # L'en-tête porte le TOTAL, pas la taille de la page.
    assert first.headers["X-Total-Count"] == "5"
    assert second.headers["X-Total-Count"] == "5"


def test_list_imports_caps_excessive_limit(authed_client, make_import, monkeypatch):
    """Un `limit=999999` ne doit pas rouvrir la porte à une liste non bornée.

    Le plafond réel (500) est abaissé le temps du test : le vérifier « pour de
    vrai » demanderait de créer 500 imports, ce qui testerait surtout la
    vitesse d'insertion de Postgres. Ce qui doit être vérifié ici, c'est que
    le code applique bien la constante, quelle que soit sa valeur.
    """
    client, _, company = authed_client
    for i in range(5):
        make_import(company.id, file_name=f"import-{i}.csv")
    monkeypatch.setattr("app.routers.imports.MAX_IMPORTS_LIMIT", 2)

    resp = client.get(f"/companies/{company.id}/imports?limit=999999")

    assert resp.status_code == 200
    assert len(resp.json()) == 2
    # Le plafonnage ne ment pas sur le total disponible.
    assert resp.headers["X-Total-Count"] == "5"


def test_list_imports_rejects_invalid_pagination(authed_client):
    client, _, company = authed_client
    assert client.get(f"/companies/{company.id}/imports?limit=0").status_code == 422
    assert client.get(f"/companies/{company.id}/imports?offset=-1").status_code == 422


def test_list_imports_defaults_unchanged_for_small_datasets(authed_client, make_import):
    """Non-régression : sans paramètre, le comportement reste celui d'avant
    (la liste complète) tant qu'on est sous le défaut."""
    client, _, company = authed_client
    for i in range(3):
        make_import(company.id, file_name=f"f{i}.csv")

    resp = client.get(f"/companies/{company.id}/imports")
    assert len(resp.json()) == 3
    assert resp.headers["X-Total-Count"] == "3"


# --- GET /companies/{id}/imports/{import_id}/transactions --------------------


def test_list_import_transactions_paginates_in_sql(
    authed_client, make_import, make_transaction
):
    client, _, company = authed_client
    imp = make_import(company.id)
    for i in range(7):
        make_transaction(
            company.id, imp.id, amount=10 + i, date=date(2024, 6, 1) + timedelta(days=i)
        )

    url = f"/companies/{company.id}/imports/{imp.id}/transactions"
    page1 = client.get(f"{url}?limit=3")
    page2 = client.get(f"{url}?limit=3&offset=3")
    page3 = client.get(f"{url}?limit=3&offset=6")

    assert [len(p.json()) for p in (page1, page2, page3)] == [3, 3, 1]
    assert page1.headers["X-Total-Count"] == "7"
    assert page3.headers["X-Total-Count"] == "7"

    # Les trois pages couvrent exactement l'ensemble, sans doublon ni trou.
    seen = [row["id"] for p in (page1, page2, page3) for row in p.json()]
    assert len(set(seen)) == 7


def test_list_import_transactions_caps_excessive_limit(
    authed_client, make_import, make_transaction, monkeypatch
):
    client, _, company = authed_client
    imp = make_import(company.id)
    for i in range(6):
        make_transaction(
            company.id, imp.id, amount=10 + i, date=date(2024, 6, 1) + timedelta(days=i)
        )
    monkeypatch.setattr("app.routers.imports.MAX_IMPORT_TRANSACTIONS_LIMIT", 3)

    resp = client.get(
        f"/companies/{company.id}/imports/{imp.id}/transactions?limit=999999"
    )

    assert resp.status_code == 200
    assert len(resp.json()) == 3
    assert resp.headers["X-Total-Count"] == "6"


def test_list_import_transactions_offset_beyond_total_returns_empty_but_real_total(
    authed_client, make_import, make_transaction
):
    client, _, company = authed_client
    imp = make_import(company.id)
    make_transaction(company.id, imp.id, amount=10, date=date(2024, 6, 1))

    resp = client.get(
        f"/companies/{company.id}/imports/{imp.id}/transactions?offset=50"
    )

    assert resp.json() == []
    assert resp.headers["X-Total-Count"] == "1"


# --- GET /companies/{id}/reports ---------------------------------------------


def test_list_reports_paginates_and_reports_real_total(authed_client, db_session):
    client, _, company = authed_client
    for i in range(4):
        db_session.add(
            Report(
                company_id=company.id,
                type="quotidien",
                period=date(2024, 6, 1) + timedelta(days=i),
                summary=f"résumé {i}",
                content={},
            )
        )
    db_session.flush()

    page = client.get(f"/companies/{company.id}/reports?limit=2")

    assert len(page.json()) == 2
    assert page.headers["X-Total-Count"] == "4"

    rest = client.get(f"/companies/{company.id}/reports?limit=2&offset=2")
    assert len(rest.json()) == 2
    assert {r["id"] for r in page.json()}.isdisjoint({r["id"] for r in rest.json()})


def test_list_reports_caps_excessive_limit(authed_client, db_session, monkeypatch):
    client, _, company = authed_client
    for i in range(4):
        db_session.add(
            Report(
                company_id=company.id,
                type="quotidien",
                period=date(2024, 7, 1) + timedelta(days=i),
                summary=f"résumé {i}",
                content={},
            )
        )
    db_session.flush()
    monkeypatch.setattr("app.routers.reports.MAX_REPORTS_LIMIT", 2)

    resp = client.get(f"/companies/{company.id}/reports?limit=999999")

    assert resp.status_code == 200
    assert len(resp.json()) == 2
    assert resp.headers["X-Total-Count"] == "4"


# --- Listes calculées en mémoire ---------------------------------------------


def test_alerts_expose_total_count_and_respect_limit(
    authed_client, make_import, make_transaction
):
    """Les alertes sont dérivées puis découpées en mémoire (elles ne sont pas
    des lignes de table) : on vérifie le contrat, pas le mécanisme SQL."""
    client, _, company = authed_client
    # Un import en quarantaine produit au moins une alerte.
    make_import(company.id, status="en_quarantaine", rows_processed=10, rows_quarantined=4)

    resp = client.get(f"/companies/{company.id}/alerts?limit=1")

    assert resp.status_code == 200
    assert len(resp.json()) == 1
    # Le total reste celui des alertes réellement produites, pas la taille de
    # la page.
    assert int(resp.headers["X-Total-Count"]) >= 1


def test_anomalies_expose_total_count(authed_client):
    """Pas de `limit`/`offset` ici : la liste est déjà plafonnée par
    `MAX_ANOMALIES`. Seul `X-Total-Count` est publié, par cohérence."""
    client, _, company = authed_client
    resp = client.get(f"/companies/{company.id}/anomalies")
    assert resp.status_code == 200
    assert resp.headers["X-Total-Count"] == str(len(resp.json()))
