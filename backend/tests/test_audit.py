"""Tests de la journalisation des actions sensibles (spec §64.25, app/audit.py).

Le journal est applicatif (module `logging` de la stdlib), pas une table :
ces tests capturent donc les entrées via la fixture `caplog` de pytest.

Deux exigences sont vérifiées ici :
1. une action sensible produit bien une entrée exploitable (acteur, entreprise,
   objet, compteurs) ;
2. aucun secret n'y figure (mot de passe, hash, token JWT).
"""

import io
import logging
import uuid

import pytest
from fastapi.testclient import TestClient

from app.audit import AUDIT_LOGGER_NAME
from app.database import get_db
from app.main import app
from app.models import Recommendation
from app.rate_limit import limiter


@pytest.fixture()
def audit_logs(caplog):
    """Capture les entrées du logger d'audit uniquement, et renvoie un accès
    par action pour éviter des assertions sur des index de liste fragiles."""
    caplog.set_level(logging.INFO, logger=AUDIT_LOGGER_NAME)

    class _Captured:
        def messages(self) -> list[str]:
            return [
                record.getMessage()
                for record in caplog.records
                if record.name == AUDIT_LOGGER_NAME
            ]

        def records(self, action: str) -> list[dict]:
            return [
                record.audit
                for record in caplog.records
                if record.name == AUDIT_LOGGER_NAME
                and getattr(record, "audit", {}).get("action") == action
            ]

        def one(self, action: str) -> dict:
            found = self.records(action)
            assert len(found) == 1, f"attendu 1 entree {action}, obtenu {len(found)}"
            return found[0]

    return _Captured()


@pytest.fixture()
def anon_client(db_session):
    """TestClient non authentifié (register/login). `limiter.reset()` pour la
    même raison que dans test_auth.py : le compteur slowapi est en mémoire au
    niveau du process et indexé sur une IP factice commune à tous les tests."""
    limiter.reset()
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()


def _csv_upload(content: str, filename: str = "releve.csv"):
    return {"file": (filename, io.BytesIO(content.encode("utf-8")), "text/csv")}


class TestAuthAuditTrail:
    def test_failed_login_is_logged_with_reason_and_without_password(
        self, anon_client, make_company, make_user, audit_logs
    ):
        """Une série d'échecs est le signal d'attaque le plus élémentaire :
        l'échec doit laisser une trace, et surtout jamais le mot de passe
        essayé."""
        company = make_company()
        make_user(company.id, email="cible@example.com", password="le-bon-mot-de-passe")

        resp = anon_client.post(
            "/auth/login",
            json={"email": "cible@example.com", "password": "MAUVAIS-mot-de-passe"},
        )
        assert resp.status_code == 401

        entry = audit_logs.one("auth.login")
        assert entry["outcome"] == "failure"
        assert entry["reason"] == "bad_password"
        assert entry["email"] == "cible@example.com"

        joined = " ".join(audit_logs.messages())
        assert "MAUVAIS-mot-de-passe" not in joined
        # Ni le mot de passe, ni son hash argon2.
        assert "$argon2" not in joined

    def test_failed_login_on_unknown_email_is_logged(self, anon_client, audit_logs):
        resp = anon_client.post(
            "/auth/login",
            json={"email": "inconnu@example.com", "password": "peu-importe"},
        )
        assert resp.status_code == 401

        entry = audit_logs.one("auth.login")
        assert entry["outcome"] == "failure"
        assert entry["reason"] == "unknown_email"

    def test_successful_login_is_logged_without_email_or_token(
        self, anon_client, make_company, make_user, audit_logs
    ):
        """Connexion réussie : `user_id` suffit au diagnostic, l'e-mail (donnée
        personnelle) n'a pas à être journalisé ici — contrairement à l'échec,
        où il n'existe pas d'autre identifiant."""
        company = make_company()
        user = make_user(company.id, email="patron@example.com", password="motdepasse-valide")

        resp = anon_client.post(
            "/auth/login",
            json={"email": "patron@example.com", "password": "motdepasse-valide"},
        )
        assert resp.status_code == 200
        token = resp.json()["access_token"]

        entry = audit_logs.one("auth.login")
        assert entry["outcome"] == "success"
        assert entry["user_id"] == str(user.id)
        assert entry["company_id"] == str(company.id)
        assert "email" not in entry

        joined = " ".join(audit_logs.messages())
        assert token not in joined
        assert "motdepasse-valide" not in joined

    def test_register_is_logged_without_credentials(self, anon_client, audit_logs):
        unique = uuid.uuid4().hex[:8]
        resp = anon_client.post(
            "/auth/register",
            json={
                "name": f"Entreprise Audit {unique}",
                "sector": "Alimentation",
                "location": "Quebec, QC",
                "employees": 3,
                "email": f"nouveau-{unique}@example.com",
                "password": "un-mot-de-passe-neuf",
            },
        )
        assert resp.status_code == 201

        entry = audit_logs.one("auth.register")
        assert entry["outcome"] == "success"
        assert entry["user_id"] is not None
        assert entry["company_id"] is not None

        joined = " ".join(audit_logs.messages())
        assert "un-mot-de-passe-neuf" not in joined
        assert resp.json()["access_token"] not in joined


class TestImportAuditTrail:
    def test_import_creation_is_logged_with_counters(self, authed_client, audit_logs):
        client, user, company = authed_client
        csv_content = (
            "Date,Montant,Categorie,Description\n"
            "01/06/2024,150.00,Ventes,Client A\n"
            "02/06/2024,pas un montant,Ventes,Client B\n"
        )

        resp = client.post(f"/companies/{company.id}/imports", files=_csv_upload(csv_content))
        assert resp.status_code == 201

        entry = audit_logs.one("import.create")
        assert entry["user_id"] == str(user.id)
        assert entry["company_id"] == str(company.id)
        assert entry["import_id"] == str(resp.json()["id"])
        assert entry["rows_processed"] == 2
        assert entry["rows_quarantined"] == 1

        # Aucun contenu metier de transaction ne doit fuiter dans le journal.
        assert "Client A" not in " ".join(audit_logs.messages())

    def test_import_deletion_is_logged_with_deleted_transaction_count(
        self, authed_client, audit_logs
    ):
        """L'action la plus destructive de l'API : elle doit dire combien de
        transactions ont réellement disparu."""
        client, user, company = authed_client
        csv_content = (
            "Date,Montant,Categorie,Description\n"
            "01/06/2024,150.00,Ventes,Client A\n"
            "02/06/2024,75.50,Ventes,Client B\n"
        )
        created = client.post(
            f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
        ).json()

        resp = client.delete(f"/companies/{company.id}/imports/{created['id']}")
        assert resp.status_code == 204

        entry = audit_logs.one("import.delete")
        assert entry["user_id"] == str(user.id)
        assert entry["company_id"] == str(company.id)
        assert entry["import_id"] == created["id"]
        assert entry["transactions_deleted"] == 2

    def test_audit_entry_is_a_single_parsable_line(self, authed_client, audit_logs):
        """Format logfmt : une ligne, des paires cle=valeur — lisible en dev et
        exploitable par un collecteur en production."""
        client, _, company = authed_client
        client.post(
            f"/companies/{company.id}/imports",
            files=_csv_upload("Date,Montant\n01/06/2024,10.00\n"),
        )

        message = next(m for m in audit_logs.messages() if "action=import.create" in m)
        assert "\n" not in message
        parsed = dict(pair.split("=", 1) for pair in message.split(" "))
        assert parsed["action"] == "import.create"
        assert parsed["outcome"] == "success"
        assert parsed["rows_processed"] == "1"
        # ASCII uniquement (console Windows cp1252).
        message.encode("ascii")


class TestCompanyAuditTrail:
    def test_company_update_logs_changed_field_names_only(self, authed_client, audit_logs):
        client, user, company = authed_client

        resp = client.patch(
            f"/companies/{company.id}",
            json={"revenue_range": "250k-1m", "employees": 12},
        )
        assert resp.status_code == 200

        entry = audit_logs.one("company.update")
        assert entry["user_id"] == str(user.id)
        assert entry["company_id"] == str(company.id)
        assert set(entry["fields"].split(",")) == {"revenue_range", "employees"}
        # Les valeurs ne sont volontairement pas journalisees.
        assert "250k-1m" not in " ".join(audit_logs.messages())


class TestRecommendationAuditTrail:
    def test_status_change_logs_old_and_new_status(
        self, authed_client, db_session, audit_logs
    ):
        client, user, company = authed_client
        rec = Recommendation(
            company_id=company.id,
            source_type="anomaly",
            source_key=f"audit-test-{uuid.uuid4().hex[:8]}",
            type="transaction_outlier",
            situation="s",
            analysis="a",
            impact="i",
            action="act",
            priority="urgente",
            status="nouvelle",
        )
        db_session.add(rec)
        db_session.flush()

        resp = client.patch(
            f"/companies/{company.id}/recommendations/{rec.id}",
            json={"status": "acceptee"},
        )
        assert resp.status_code == 200

        entry = audit_logs.one("recommendation.status_change")
        assert entry["user_id"] == str(user.id)
        assert entry["recommendation_id"] == str(rec.id)
        assert entry["old_status"] == "nouvelle"
        assert entry["new_status"] == "acceptee"
