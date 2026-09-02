"""Tests HTTP pour PATCH /companies/{id} (app/routers/companies.py)."""

from fastapi.testclient import TestClient

from app.main import app


def test_company_options_exposes_currency_choices():
    resp = TestClient(app).get("/meta/company-options")
    assert resp.status_code == 200
    assert "CAD" in resp.json()["currencies"]


class TestUpdateCurrency:
    def test_update_changes_currency(self, authed_client):
        client, _, company = authed_client
        assert company.currency == "CAD"

        resp = client.patch(f"/companies/{company.id}", json={"currency": "EUR"})

        assert resp.status_code == 200
        assert resp.json()["currency"] == "EUR"

    def test_update_rejects_unknown_currency(self, authed_client):
        client, _, company = authed_client

        resp = client.patch(f"/companies/{company.id}", json={"currency": "XYZ"})

        assert resp.status_code == 422

    def test_update_without_currency_leaves_it_unchanged(self, authed_client):
        """`exclude_unset=True` (routers/companies.py) : un PATCH qui ne
        mentionne pas `currency` ne doit jamais l'effacer — la colonne n'est
        pas nullable en base."""
        client, _, company = authed_client
        client.patch(f"/companies/{company.id}", json={"currency": "USD"})

        resp = client.patch(f"/companies/{company.id}", json={"employees": 42})

        assert resp.status_code == 200
        assert resp.json()["currency"] == "USD"
