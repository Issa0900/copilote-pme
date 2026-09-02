"""Tests fonctionnels/comportementaux de l'endpoint d'import
(app/routers/imports.py) et de son intégration avec le pipeline d'ingestion
(app/ingestion.py) : dédoublonnage réel, limite de taille, formats supportés,
colonnes synonymes et quarantaine — au-delà des tests unitaires purs déjà
présents dans test_ingestion.py."""

import io

import pytest

from app.routers.imports import MAX_IMPORT_FILE_SIZE


def _csv_upload(content: str, filename: str = "releve.csv"):
    return {"file": (filename, io.BytesIO(content.encode("utf-8")), "text/csv")}


def _json_upload(content: str, filename: str = "releve.json"):
    return {"file": (filename, io.BytesIO(content.encode("utf-8")), "application/json")}


def _xml_upload(content: str, filename: str = "releve.xml"):
    return {"file": (filename, io.BytesIO(content.encode("utf-8")), "application/xml")}


def test_create_import_nominal_csv_creates_transactions(authed_client):
    client, _, company = authed_client
    csv_content = (
        "Date,Montant,Categorie,Description\n"
        "01/06/2024,150.00,Ventes,Client A\n"
        "02/06/2024,75.50,Ventes,Client B\n"
    )

    resp = client.post(
        f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "complete"
    assert body["rows_processed"] == 2
    assert body["rows_quarantined"] == 0

    txns = client.get(f"/companies/{company.id}/imports/{body['id']}/transactions")
    assert txns.status_code == 200
    assert len(txns.json()) == 2


def test_create_import_synonym_headers_are_mapped(authed_client):
    """En-têtes différents des noms canoniques (date/montant/categorie/
    description) : doivent être reconnus via les synonymes (app/ingestion.py)
    plutôt que de faire échouer le mapping."""
    client, _, company = authed_client
    csv_content = (
        "Jour,Prix,Type,Client\n"
        "05/07/2024,99.99,Services,Client Synonyme\n"
    )

    resp = client.post(
        f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["rows_processed"] == 1
    assert body["rows_quarantined"] == 0

    txns = client.get(
        f"/companies/{company.id}/imports/{body['id']}/transactions"
    ).json()
    assert len(txns) == 1
    assert txns[0]["amount"] == 99.99
    assert txns[0]["category"] == "Services"
    assert txns[0]["description"] == "Client Synonyme"


def test_create_import_invalid_rows_are_quarantined_not_fatal(authed_client):
    """Des lignes invalides (montant illisible) sont mises en quarantaine
    plutôt que de faire échouer tout l'import (PRD 8.6/section 36)."""
    client, _, company = authed_client
    csv_content = (
        "Date,Montant,Categorie\n"
        "01/06/2024,150.00,Ventes\n"
        "02/06/2024,pas un montant,Ventes\n"
    )

    resp = client.post(
        f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "en_quarantaine"
    assert body["rows_processed"] == 2
    assert body["rows_quarantined"] == 1

    txns = client.get(
        f"/companies/{company.id}/imports/{body['id']}/transactions"
    ).json()
    assert len(txns) == 2
    statuses = {t["status"] for t in txns}
    assert statuses == {"validated", "quarantined"}
    quarantined = next(t for t in txns if t["status"] == "quarantined")
    assert "montant manquant ou illisible" in quarantined["quarantine_reasons"]


def test_create_import_unsupported_format_is_rejected_cleanly(authed_client):
    """Un format non supporté (hors SUPPORTED_EXTENSIONS) doit être rejeté
    proprement en 422, pas planter en 500."""
    client, _, company = authed_client
    files = {
        "file": (
            "releve.docx",
            io.BytesIO(b"peu importe le contenu"),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    }

    resp = client.post(f"/companies/{company.id}/imports", files=files)

    assert resp.status_code == 422
    assert "non supporté" in resp.json()["detail"]


def test_create_import_oversized_file_is_rejected_cleanly(authed_client):
    """Un fichier au-dessus de MAX_IMPORT_FILE_SIZE (10 Mo) doit être rejeté
    proprement (413), pas planter en 500 ni être chargé intégralement en
    mémoire avant vérification."""
    client, _, company = authed_client
    oversized_content = b"a" * (MAX_IMPORT_FILE_SIZE + 1)
    files = {"file": ("gros_fichier.csv", io.BytesIO(oversized_content), "text/csv")}

    resp = client.post(f"/companies/{company.id}/imports", files=files)

    assert resp.status_code == 413
    assert "volumineux" in resp.json()["detail"]

    # Le fichier rejeté ne doit pas avoir créé d'enregistrement Import.
    imports = client.get(f"/companies/{company.id}/imports").json()
    assert imports == []


def test_create_import_deduplicates_across_successive_imports(authed_client):
    """Deux imports successifs contenant des lignes identiques (même date/
    montant/description) ne doivent pas créer de doublons en base (PRD 8.6/
    9.3) — le second import ignore silencieusement la ligne déjà connue."""
    client, _, company = authed_client
    csv_content = (
        "Date,Montant,Categorie,Description\n"
        "01/06/2024,150.00,Ventes,Client A\n"
    )

    first = client.post(
        f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
    )
    assert first.status_code == 201
    assert first.json()["rows_processed"] == 1

    second = client.post(
        f"/companies/{company.id}/imports",
        files=_csv_upload(csv_content, filename="releve2.csv"),
    )
    assert second.status_code == 201
    second_body = second.json()
    # Le second import "voit" bien la ligne (rows_processed reflète le
    # fichier soumis) mais ne doit pas l'avoir réinsérée en transaction.
    assert second_body["rows_processed"] == 1

    second_txns = client.get(
        f"/companies/{company.id}/imports/{second_body['id']}/transactions"
    ).json()
    assert second_txns == []

    # Au total, une seule transaction existe pour l'entreprise malgré deux
    # imports du même contenu.
    first_txns = client.get(
        f"/companies/{company.id}/imports/{first.json()['id']}/transactions"
    ).json()
    assert len(first_txns) == 1


def test_create_import_deduplicates_mixed_new_and_duplicate_rows(authed_client):
    """Un import qui mélange une ligne déjà connue et une ligne nouvelle
    n'insère que la ligne nouvelle."""
    client, _, company = authed_client
    first_csv = (
        "Date,Montant,Categorie,Description\n"
        "01/06/2024,150.00,Ventes,Client A\n"
    )
    first = client.post(
        f"/companies/{company.id}/imports", files=_csv_upload(first_csv)
    )
    assert first.status_code == 201

    second_csv = (
        "Date,Montant,Categorie,Description\n"
        "01/06/2024,150.00,Ventes,Client A\n"
        "03/06/2024,200.00,Ventes,Client C\n"
    )
    second = client.post(
        f"/companies/{company.id}/imports",
        files=_csv_upload(second_csv, filename="releve2.csv"),
    )
    assert second.status_code == 201
    second_body = second.json()
    assert second_body["rows_processed"] == 2

    second_txns = client.get(
        f"/companies/{company.id}/imports/{second_body['id']}/transactions"
    ).json()
    assert len(second_txns) == 1
    assert second_txns[0]["description"] == "Client C"


def test_create_import_supported_formats_are_accepted(authed_client):
    """Vérifie que les extensions annoncées comme supportées
    (SUPPORTED_EXTENSIONS: csv, tsv) sont bien acceptées de bout en bout via
    l'API (xlsx/xls/pdf sont couverts par les tests unitaires de
    load_dataframe pour éviter la dépendance à des fixtures binaires ici)."""
    client, _, company = authed_client
    tsv_content = "Date\tMontant\tCategorie\n01/06/2024\t42.00\tVentes\n"
    files = {
        "file": ("releve.tsv", io.BytesIO(tsv_content.encode("utf-8")), "text/tab-separated-values")
    }

    resp = client.post(f"/companies/{company.id}/imports", files=files)

    assert resp.status_code == 201
    body = resp.json()
    assert body["rows_processed"] == 1
    assert body["rows_quarantined"] == 0


def test_create_import_nominal_json_creates_transactions(authed_client):
    client, _, company = authed_client
    json_content = (
        '[{"date": "01/06/2024", "montant": 150.00, "categorie": "Ventes", '
        '"description": "Client A"},'
        '{"date": "02/06/2024", "montant": 75.50, "categorie": "Ventes", '
        '"description": "Client B"}]'
    )

    resp = client.post(
        f"/companies/{company.id}/imports", files=_json_upload(json_content)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "complete"
    assert body["rows_processed"] == 2
    assert body["rows_quarantined"] == 0

    txns = client.get(
        f"/companies/{company.id}/imports/{body['id']}/transactions"
    ).json()
    assert len(txns) == 2
    amounts = {t["amount"] for t in txns}
    assert amounts == {150.0, 75.5}


def test_create_import_json_single_object_creates_one_transaction(authed_client):
    """Un JSON top-level qui est un objet unique (plutôt qu'un tableau) doit
    être traité comme une seule transaction, pas rejeté."""
    client, _, company = authed_client
    json_content = (
        '{"date": "01/06/2024", "montant": 150.00, "categorie": "Ventes"}'
    )

    resp = client.post(
        f"/companies/{company.id}/imports", files=_json_upload(json_content)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["rows_processed"] == 1
    assert body["rows_quarantined"] == 0


def test_create_import_malformed_json_marks_import_as_failed(authed_client):
    """Un JSON malformé est un UnparsableFileError (app/ingestion.py), géré
    en amont par create_import : import créé avec status "echoue", pas
    d'erreur HTTP (même pattern que le fichier vide, voir plus bas)."""
    client, _, company = authed_client

    resp = client.post(
        f"/companies/{company.id}/imports", files=_json_upload("{not valid json")
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "echoue"
    assert "corrompu" in body["error_message"]


def test_create_import_nominal_xml_creates_transactions(authed_client):
    client, _, company = authed_client
    xml_content = (
        "<transactions>"
        "<transaction><date>01/06/2024</date><montant>150.00</montant>"
        "<categorie>Ventes</categorie><description>Client A</description></transaction>"
        "<transaction><date>02/06/2024</date><montant>75.50</montant>"
        "<categorie>Ventes</categorie><description>Client B</description></transaction>"
        "</transactions>"
    )

    resp = client.post(
        f"/companies/{company.id}/imports", files=_xml_upload(xml_content)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "complete"
    assert body["rows_processed"] == 2
    assert body["rows_quarantined"] == 0

    txns = client.get(
        f"/companies/{company.id}/imports/{body['id']}/transactions"
    ).json()
    assert len(txns) == 2
    amounts = {t["amount"] for t in txns}
    assert amounts == {150.0, 75.5}


def test_create_import_malformed_xml_marks_import_as_failed(authed_client):
    client, _, company = authed_client
    malformed_xml = "<transactions><transaction></transactions>"

    resp = client.post(
        f"/companies/{company.id}/imports", files=_xml_upload(malformed_xml)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "echoue"
    assert "corrompu" in body["error_message"]


class TestImportTransparency:
    """Spec §64.5 (« les colonnes inconnues sont signalées ») et §64.19 (« les
    doublons sont détectés », « les problèmes sont détaillés ») : ces deux
    informations étaient calculées ou perdues en silence."""

    def test_unrecognized_columns_are_reported(self, authed_client):
        client, _, company = authed_client
        csv_content = (
            "Date,Montant,Categorie,Numero de facture,Vendeur\n"
            "01/06/2024,150.00,Ventes,F-001,Alice\n"
        )

        resp = client.post(
            f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
        )

        assert resp.status_code == 201
        body = resp.json()
        # Ordre du fichier conservé, colonnes reconnues absentes.
        assert body["unrecognized_columns"] == ["Numero de facture", "Vendeur"]

    def test_fully_recognized_file_reports_no_unrecognized_column(self, authed_client):
        client, _, company = authed_client
        csv_content = (
            "Date,Montant,Categorie,Description\n"
            "01/06/2024,150.00,Ventes,Client A\n"
        )

        resp = client.post(
            f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
        )

        assert resp.status_code == 201
        assert resp.json()["unrecognized_columns"] == []

    def test_duplicates_skipped_is_reported(self, authed_client):
        """Le second import contient une ligne déjà connue et une nouvelle :
        la réponse doit annoncer exactement 1 doublon écarté."""
        client, _, company = authed_client
        first_csv = (
            "Date,Montant,Categorie,Description\n"
            "01/06/2024,150.00,Ventes,Client A\n"
        )
        first = client.post(
            f"/companies/{company.id}/imports", files=_csv_upload(first_csv)
        )
        assert first.status_code == 201
        assert first.json()["duplicates_skipped"] == 0

        second_csv = (
            "Date,Montant,Categorie,Description\n"
            "01/06/2024,150.00,Ventes,Client A\n"
            "03/06/2024,200.00,Ventes,Client C\n"
        )
        second = client.post(
            f"/companies/{company.id}/imports",
            files=_csv_upload(second_csv, filename="releve2.csv"),
        )

        assert second.status_code == 201
        body = second.json()
        assert body["rows_processed"] == 2
        assert body["duplicates_skipped"] == 1

    def test_duplicates_within_the_same_file_are_reported(self, authed_client):
        """Deux lignes identiques dans un même fichier : la seconde est un
        doublon (elle est ajoutée à `existing_keys` au fil de la boucle)."""
        client, _, company = authed_client
        csv_content = (
            "Date,Montant,Categorie,Description\n"
            "01/06/2024,150.00,Ventes,Client A\n"
            "01/06/2024,150.00,Ventes,Client A\n"
        )

        resp = client.post(
            f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
        )

        assert resp.status_code == 201
        assert resp.json()["duplicates_skipped"] == 1


def test_create_import_empty_file_marks_import_as_failed(authed_client):
    """Un fichier sans aucune ligne de donnée doit marquer l'import comme
    échoué proprement plutôt que de planter."""
    client, _, company = authed_client
    csv_content = "Date,Montant,Categorie\n"

    resp = client.post(
        f"/companies/{company.id}/imports", files=_csv_upload(csv_content)
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "echoue"
    assert body["rows_processed"] == 0
