"""Fixtures de test : chaque test tourne dans une transaction sur la base
Postgres locale de dev (docker-compose, `backend/.env`), annulée à la fin —
aucune donnée de test ne persiste, aucune base séparée n'est nécessaire."""

import uuid

import pytest
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

from app.database import engine
from app.models import Company, Import, Transaction


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
