"""Tests HTTP d'autorisation / isolation multi-tenant (correctif VULN-002).

Vérifie, pour au moins un endpoint représentatif de chaque router protégé
par `require_company_access`, que :
  - un appel sans header Authorization renvoie 401 ;
  - un appel avec un token valide mais pour une AUTRE entreprise renvoie 403 ;
  - un appel avec le bon token pour la bonne entreprise renvoie 200 et ne
    renvoie que les données de cette entreprise (pas de fuite croisée).

Utilise les fixtures `authed_client`, `make_company`, `make_user` de
conftest.py (ne pas les redéfinir)."""

from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.main import app

# (méthode, template d'URL, router source) — un endpoint représentatif par
# router protégé par `dependencies=[Depends(require_company_access)]` (ou,
# pour companies.py, par la dépendance appliquée directement sur la route).
PROTECTED_ENDPOINTS = [
    ("GET", "/companies/{company_id}", "companies.py"),
    ("GET", "/companies/{company_id}/imports", "imports.py"),
    ("GET", "/companies/{company_id}/kpis", "dashboard.py"),
    ("GET", "/companies/{company_id}/alerts", "alerts.py"),
    ("GET", "/companies/{company_id}/anomalies", "anomalies.py"),
    ("GET", "/companies/{company_id}/recommendations", "recommendations.py"),
    ("GET", "/companies/{company_id}/reports", "reports.py"),
]


@pytest.mark.parametrize("method, url_template, router", PROTECTED_ENDPOINTS, ids=[r for *_, r in PROTECTED_ENDPOINTS])
def test_protected_endpoint_requires_auth(authed_client, method, url_template, router):
    client, _user, company = authed_client
    url = url_template.format(company_id=company.id)

    # Pas de header Authorization du tout : même app (mêmes dependency
    # overrides get_db actifs via authed_client) mais un TestClient neuf,
    # sans le header par défaut posé par authed_client.
    anon_client = TestClient(app)
    resp = anon_client.request(method, url)
    assert resp.status_code == 401, f"{router}: {method} {url} sans token devrait renvoyer 401"


@pytest.mark.parametrize("method, url_template, router", PROTECTED_ENDPOINTS, ids=[r for *_, r in PROTECTED_ENDPOINTS])
def test_protected_endpoint_rejects_other_tenant_token(
    authed_client, make_company, make_user, method, url_template, router
):
    client, _user_a, company_a = authed_client

    company_b = make_company(name="Entreprise B")
    user_b = make_user(company_b.id, email="userb@example.com")
    token_b = create_access_token(user_b)

    url = url_template.format(company_id=company_a.id)
    resp = client.request(method, url, headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 403, (
        f"{router}: {method} {url} avec le token d'une autre entreprise devrait renvoyer 403"
    )


@pytest.mark.parametrize("method, url_template, router", PROTECTED_ENDPOINTS, ids=[r for *_, r in PROTECTED_ENDPOINTS])
def test_protected_endpoint_allows_own_tenant_token(authed_client, method, url_template, router):
    client, _user, company = authed_client
    url = url_template.format(company_id=company.id)
    resp = client.request(method, url)
    assert resp.status_code == 200, f"{router}: {method} {url} avec le bon token devrait renvoyer 200"


def test_get_companies_me_returns_only_own_company_and_requires_auth(authed_client):
    client, _user, company = authed_client

    resp = client.get("/companies/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(company.id)
    assert body["name"] == company.name

    anon_client = TestClient(app)
    anon_resp = anon_client.get("/companies/me")
    assert anon_resp.status_code == 401


def test_post_companies_no_longer_exists(authed_client):
    """POST /companies (création libre, VULN-001/002) a été retirée : la
    création d'entreprise ne passe plus que par POST /auth/register."""
    client, _user, _company = authed_client
    resp = client.post(
        "/companies",
        json={"name": "X", "sector": "X", "location": "X", "employees": 1},
    )
    assert resp.status_code in (404, 405)


def test_get_companies_list_no_longer_exists(authed_client):
    """GET /companies (liste de toutes les entreprises tous tenants confondus,
    VULN-002) a été retirée au profit de GET /companies/me."""
    client, _user, _company = authed_client
    resp = client.get("/companies")
    assert resp.status_code in (404, 405)


def test_public_endpoints_remain_accessible_without_token():
    anon_client = TestClient(app)
    assert anon_client.get("/health").status_code == 200
    assert anon_client.get("/meta/company-options").status_code == 200


class TestCrossTenantDataIsolation:
    """Le test le plus important du fichier : prouve concrètement que des
    données créées dans deux entreprises différentes ne fuient jamais d'une
    entreprise à l'autre via les endpoints protégés (VULN-002)."""

    def test_kpis_never_mix_data_across_companies(
        self, authed_client, make_company, make_user, make_import, make_transaction
    ):
        client, user_a, company_a = authed_client
        company_b = make_company(name="Entreprise B")
        user_b = make_user(company_b.id, email="userb-kpis@example.com")
        token_b = create_access_token(user_b)

        imp_a = make_import(company_a.id)
        make_transaction(company_a.id, imp_a.id, amount=100, date=date(2024, 6, 1))

        imp_b = make_import(company_b.id)
        make_transaction(company_b.id, imp_b.id, amount=99999, date=date(2024, 6, 1))

        resp_a = client.get(f"/companies/{company_a.id}/kpis")
        assert resp_a.status_code == 200
        assert resp_a.json()["revenue_total"] == 100.0

        resp_b = client.get(
            f"/companies/{company_b.id}/kpis", headers={"Authorization": f"Bearer {token_b}"}
        )
        assert resp_b.status_code == 200
        assert resp_b.json()["revenue_total"] == 99999.0

    def test_imports_list_never_mixes_across_companies(
        self, authed_client, make_company, make_user, make_import
    ):
        client, user_a, company_a = authed_client
        company_b = make_company(name="Entreprise B")
        user_b = make_user(company_b.id, email="userb-imports@example.com")
        token_b = create_access_token(user_b)

        make_import(company_a.id, file_name="fichier_a.csv")
        make_import(company_b.id, file_name="fichier_b.csv")

        resp_a = client.get(f"/companies/{company_a.id}/imports")
        assert resp_a.status_code == 200
        names_a = [i["file_name"] for i in resp_a.json()]
        assert names_a == ["fichier_a.csv"]

        resp_b = client.get(
            f"/companies/{company_b.id}/imports", headers={"Authorization": f"Bearer {token_b}"}
        )
        assert resp_b.status_code == 200
        names_b = [i["file_name"] for i in resp_b.json()]
        assert names_b == ["fichier_b.csv"]

    def test_company_detail_never_leaks_other_company_name(
        self, authed_client, make_company, make_user
    ):
        client, _user_a, company_a = authed_client
        company_b = make_company(name="Entreprise B Confidentielle")
        user_b = make_user(company_b.id, email="userb-company@example.com")
        token_b = create_access_token(user_b)

        resp_a = client.get(f"/companies/{company_a.id}")
        assert resp_a.status_code == 200
        assert resp_a.json()["name"] == company_a.name

        resp_b = client.get(
            f"/companies/{company_b.id}", headers={"Authorization": f"Bearer {token_b}"}
        )
        assert resp_b.status_code == 200
        assert resp_b.json()["name"] == "Entreprise B Confidentielle"
