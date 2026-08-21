"""Fixtures de test : chaque test tourne dans une transaction sur la base
Postgres locale de dev (docker-compose, `backend/.env`), annulée à la fin —
aucune donnée de test ne persiste, aucune base séparée n'est nécessaire."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

from app.auth import create_access_token, hash_password
from app.database import engine, get_db
from app.main import app
from app.models import Company, Import, Transaction, User


@pytest.fixture()
def db_session():
    connection = engine.connect()
    outer_transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def make_company(db_session):
    def _make(**overrides):
        company = Company(
            name=overrides.pop("name", "Entreprise Test"),
            sector=overrides.pop("sector", "Test"),
            location=overrides.pop("location", "Quebec, QC"),
            employees=overrides.pop("employees", 5),
            **overrides,
        )
        db_session.add(company)
        db_session.flush()
        return company

    return _make


@pytest.fixture()
def make_import(db_session):
    def _make(company_id, **overrides):
        imp = Import(
            company_id=company_id,
            source_type=overrides.pop("source_type", "csv"),
            file_name=overrides.pop("file_name", "test.csv"),
            status=overrides.pop("status", "complete"),
            rows_processed=overrides.pop("rows_processed", 0),
            rows_quarantined=overrides.pop("rows_quarantined", 0),
            **overrides,
        )
        db_session.add(imp)
        db_session.flush()
        return imp

    return _make


@pytest.fixture()
def make_user(db_session):
    def _make(company_id, **overrides):
        user = User(
            company_id=company_id,
            email=overrides.pop("email", "test@example.com"),
            hashed_password=hash_password(overrides.pop("password", "test-password-123")),
            **overrides,
        )
        db_session.add(user)
        db_session.flush()
        return user

    return _make


@pytest.fixture()
def authed_client(db_session, make_company, make_user):
    """Fournit un TestClient dont la dépendance get_db pointe vers la même
    transaction (db_session, annulée en fin de test — cf. fixture db_session)
    et dont le header Authorization porte déjà un token valide pour un
    utilisateur/entreprise de test fraîchement créés.

    Usage pour ing-qa lors de la migration des tests HTTP existants :

        def test_something(authed_client):
            client, user, company = authed_client
            resp = client.get(f"/companies/{company.id}/kpis")
            assert resp.status_code == 200

    Pour tester un accès refusé entre organisations, générer un second couple
    company/user avec `make_company`/`make_user` et son propre token via
    `create_access_token`.
    """
    company = make_company()
    user = make_user(company.id)
    token = create_access_token(user)

    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app, headers={"Authorization": f"Bearer {token}"})
    try:
        yield client, user, company
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def make_transaction(db_session):
    def _make(company_id, import_id, **overrides):
        txn = Transaction(
            company_id=company_id,
            import_id=import_id,
            date=overrides.pop("date", None),
            amount=overrides.pop("amount", None),
            category=overrides.pop("category", None),
            description=overrides.pop("description", None),
            status=overrides.pop("status", "validated"),
            raw_data=overrides.pop("raw_data", {}),
            **overrides,
        )
        db_session.add(txn)
        db_session.flush()
        return txn

    return _make
