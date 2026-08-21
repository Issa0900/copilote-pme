"""Tests HTTP pour /auth/register et /auth/login (correctif VULN-001).

Contrairement aux autres fichiers de tests (qui appellent les modules
métier directement via `db_session`), ces tests passent par un vrai
`TestClient` FastAPI puisque l'authentification est un comportement au
niveau HTTP (status codes, headers, corps de réponse)."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import Company, User
from app.rate_limit import limiter


@pytest.fixture()
def client(db_session):
    """TestClient non authentifié, avec get_db pointé vers la transaction de
    test (cf. conftest.authed_client pour le même principe avec un token).

    Le rate limiter (slowapi) garde son compteur en mémoire au niveau du
    process, indexé par IP — et TestClient utilise la même IP factice
    ("testclient") pour toutes les requêtes, quel que soit le test. Sans
    reset, les tentatives faites par un test précédent compteraient dans le
    quota du test suivant (et inversement, ce test polluerait les suivants).
    On réinitialise donc le compteur avant *et* après chaque test qui utilise
    ce client, pour que chaque test dispose de son propre quota plein."""
    limiter.reset()
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()


def _valid_register_payload(**overrides):
    # Email et nom d'entreprise randomisés : la base de dev partagée
    # (backend/.env, cf. conftest.py) contient déjà des données créées lors
    # de tests manuels réels (register/login) par ing-backend, en dehors de
    # toute transaction de test — un nom/email fixe collisionnerait avec ces
    # lignes préexistantes lors des assertions faites via des requêtes SQL
    # directes (filter().one() verrait plusieurs résultats).
    unique = uuid.uuid4().hex[:8]
    payload = {
        "name": f"Boulangerie Test {unique}",
        "sector": "Alimentation",
        "location": "Quebec, QC",
        "employees": 5,
        "email": f"owner-{unique}@example.com",
        "password": "supersecret123",
    }
    payload.update(overrides)
    return payload


class TestRegister:
    def test_register_success_returns_token_and_creates_company_and_user(
        self, client, db_session
    ):
        payload = _valid_register_payload()
        resp = client.post("/auth/register", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["access_token"]
        assert isinstance(body["access_token"], str)
        assert body["token_type"] == "bearer"

        user = db_session.query(User).filter(User.email == payload["email"]).one()
        company = db_session.get(Company, user.company_id)
        assert company is not None
        assert company.name == payload["name"]
        assert company.sector == payload["sector"]

    def test_register_duplicate_email_returns_409(self, client):
        payload = _valid_register_payload()
        first = client.post("/auth/register", json=payload)
        assert first.status_code == 201

        second = client.post(
            "/auth/register",
            json=_valid_register_payload(name="Autre Entreprise", email=payload["email"]),
        )
        assert second.status_code == 409

    def test_register_password_too_short_returns_422(self, client):
        payload = _valid_register_payload(password="short1")  # 6 caractères
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_invalid_company_field_returns_422(self, client):
        payload = _valid_register_payload(objectives=["objectif_qui_n_existe_pas"])
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 422


class TestLogin:
    def test_login_success_returns_token(self, client):
        payload = _valid_register_payload()
        client.post("/auth/register", json=payload)

        resp = client.post(
            "/auth/login", json={"email": payload["email"], "password": payload["password"]}
        )
        assert resp.status_code == 200
        assert resp.json()["access_token"]

    def test_login_unknown_email_returns_generic_401(self, client):
        resp = client.post(
            "/auth/login",
            json={"email": "inconnu@example.com", "password": "peu-importe123"},
        )
        assert resp.status_code == 401
        unknown_email_detail = resp.json()["detail"]

        # Le message doit être identique à celui du mauvais mot de passe
        # (cf. test_login_wrong_password_returns_same_generic_401) pour ne
        # pas permettre l'énumération de comptes.
        assert unknown_email_detail == "Email ou mot de passe incorrect"

    def test_login_wrong_password_returns_same_generic_401(self, client):
        payload = _valid_register_payload()
        client.post("/auth/register", json=payload)

        resp = client.post(
            "/auth/login", json={"email": payload["email"], "password": "mot-de-passe-errone"}
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Email ou mot de passe incorrect"


class TestRateLimiting:
    """Correctif VULN-005 : /auth/login et /auth/register n'avaient aucun
    rate limiting (brute-force sur login, énumération d'emails via le 409
    sur register). Cf. app/rate_limit.py et les commentaires sur les
    décorateurs @limiter.limit(...) dans app/routers/auth.py pour le détail
    des seuils retenus."""

    def test_login_blocked_after_10_attempts_per_minute(self, client):
        payload = _valid_register_payload()
        client.post("/auth/register", json=payload)

        wrong_login = {"email": payload["email"], "password": "mot-de-passe-errone"}

        # Les 10 premières tentatives passent le rate limiter (elles restent
        # 401 puisque le mot de passe est faux, seule la limite nous
        # intéresse ici).
        for _ in range(10):
            resp = client.post("/auth/login", json=wrong_login)
            assert resp.status_code == 401

        blocked = client.post("/auth/login", json=wrong_login)
        assert blocked.status_code == 429
        assert blocked.json() == {
            "detail": "Trop de tentatives, réessayez dans quelques instants"
        }

    def test_login_under_threshold_is_not_blocked(self, client):
        payload = _valid_register_payload()
        client.post("/auth/register", json=payload)

        for _ in range(3):
            resp = client.post(
                "/auth/login",
                json={"email": payload["email"], "password": payload["password"]},
            )
            assert resp.status_code == 200

    def test_register_blocked_after_5_attempts_per_minute(self, client):
        # Les 5 premières inscriptions (emails distincts) passent le rate
        # limiter, la 6e est bloquée quel que soit l'email utilisé — la
        # limite est par IP, pas par email.
        for _ in range(5):
            resp = client.post("/auth/register", json=_valid_register_payload())
            assert resp.status_code == 201

        blocked = client.post("/auth/register", json=_valid_register_payload())
        assert blocked.status_code == 429
        assert blocked.json() == {
            "detail": "Trop de tentatives, réessayez dans quelques instants"
        }

    def test_register_under_threshold_is_not_blocked(self, client):
        for _ in range(3):
            resp = client.post("/auth/register", json=_valid_register_payload())
            assert resp.status_code == 201
