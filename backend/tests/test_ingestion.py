from datetime import date, timedelta

import pandas as pd
import pytest

from app.ingestion import (
    UnsupportedFileError,
    _map_columns,
    _normalize_header,
    _parse_amount,
    _parse_date,
    get_extension,
    map_and_validate,
)


def test_get_extension_supported():
    assert get_extension("releve.csv") == "csv"


def test_get_extension_unsupported():
    with pytest.raises(UnsupportedFileError):
        get_extension("releve.docx")


def test_get_extension_missing():
    with pytest.raises(UnsupportedFileError):
        get_extension("releve")


def test_normalize_header_accents_and_spaces():
    assert _normalize_header("Catégorie") == "categorie"
    assert _normalize_header(" Type de transaction ") == "typedetransaction"


def test_map_columns_finds_synonyms_despite_accents():
    mapping = _map_columns(["Date", "Montant", "Catégorie", "Description"])
    assert mapping == {
        "date": "Date",
        "amount": "Montant",
        "category": "Catégorie",
        "description": "Description",
    }


def test_parse_amount_handles_quebec_format():
    # espace comme séparateur de milliers, virgule décimale, symbole $
    assert _parse_amount("1 234,56 $") == 1234.56


def test_parse_amount_invalid_returns_none():
    assert _parse_amount("pas un montant") is None


def test_parse_amount_none_and_nan():
    assert _parse_amount(None) is None
    assert _parse_amount(float("nan")) is None


def test_parse_date_dayfirst_quebec_format():
    # Régression : dayfirst=True est requis pour le marché Québec/Canada
    # (03/04/2024 doit être le 3 avril, pas le 4 mars).
    assert _parse_date("03/04/2024") == date(2024, 4, 3)


def test_parse_date_invalid_returns_none():
    assert _parse_date("pas une date") is None


def test_map_and_validate_nominal_row_is_validated():
    df = pd.DataFrame(
        [{"Date": "01/06/2024", "Montant": "150,00", "Categorie": "Ventes"}]
    )
    rows = map_and_validate(df)
    assert len(rows) == 1
    row = rows[0]
    assert row.status == "validated"
    assert row.date == date(2024, 6, 1)
    assert row.amount == 150.0
    assert row.quarantine_reasons == []


def test_map_and_validate_missing_amount_is_quarantined():
    df = pd.DataFrame([{"Date": "01/06/2024", "Montant": None}])
    rows = map_and_validate(df)
    assert rows[0].status == "quarantined"
    assert "montant manquant ou illisible" in rows[0].quarantine_reasons


def test_map_and_validate_future_date_is_quarantined():
    future = (date.today() + timedelta(days=5)).strftime("%d/%m/%Y")
    df = pd.DataFrame([{"Date": future, "Montant": "10"}])
    rows = map_and_validate(df)
    assert rows[0].status == "quarantined"
    assert "date de transaction future" in rows[0].quarantine_reasons


def test_map_and_validate_no_date_column_quarantines_all_rows():
    df = pd.DataFrame([{"Montant": "10"}, {"Montant": "20"}])
    rows = map_and_validate(df)
    assert all(r.status == "quarantined" for r in rows)
