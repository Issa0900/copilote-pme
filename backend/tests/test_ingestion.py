import io
import shutil
from datetime import date, timedelta

import pandas as pd
import pymupdf as fitz
import pytesseract
import pytest

from app.ingestion import (
    UnparsableFileError,
    UnsupportedFileError,
    _extract_ocr_transaction_row,
    _map_columns,
    _normalize_header,
    _parse_amount,
    _parse_date,
    get_extension,
    load_dataframe,
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


def test_load_dataframe_ods_nominal():
    # ODS généré en mémoire (pas de fichier binaire committé), même pattern
    # que xlsx/xls : engine="odf" explicite requis (voir _read_tabular).
    source_df = pd.DataFrame(
        [{"Date": "01/06/2024", "Montant": 150.0, "Categorie": "Ventes"}]
    )
    buffer = io.BytesIO()
    source_df.to_excel(buffer, engine="odf", index=False)

    df = load_dataframe("releve.ods", buffer.getvalue())

    assert list(df.columns) == ["Date", "Montant", "Categorie"]
    assert df.iloc[0]["Montant"] == 150.0


def test_load_dataframe_ods_corrupted_raises_unparsable():
    with pytest.raises(UnparsableFileError):
        load_dataframe("releve.ods", b"not an ods file")


def test_load_dataframe_json_nominal_array_of_objects():
    content = (
        b'[{"date": "01/06/2024", "montant": 150.0, "categorie": "Ventes"},'
        b'{"date": "02/06/2024", "montant": 75.5, "categorie": "Ventes"}]'
    )
    df = load_dataframe("releve.json", content)
    assert len(df) == 2
    assert list(df.columns) == ["date", "montant", "categorie"]


def test_load_dataframe_json_single_object_becomes_one_row():
    content = b'{"date": "01/06/2024", "montant": 150.0, "categorie": "Ventes"}'
    df = load_dataframe("releve.json", content)
    assert len(df) == 1
    assert df.iloc[0]["montant"] == 150.0


def test_load_dataframe_json_malformed_raises_unparsable():
    with pytest.raises(UnparsableFileError):
        load_dataframe("releve.json", b"{not valid json")


def test_load_dataframe_xml_nominal_repeated_elements():
    content = (
        b"<transactions>"
        b"<transaction><date>01/06/2024</date><montant>150.00</montant>"
        b"<categorie>Ventes</categorie></transaction>"
        b"<transaction><date>02/06/2024</date><montant>75.50</montant>"
        b"<categorie>Ventes</categorie></transaction>"
        b"</transactions>"
    )
    df = load_dataframe("releve.xml", content)
    assert len(df) == 2
    assert list(df.columns) == ["date", "montant", "categorie"]


def test_load_dataframe_xml_malformed_raises_unparsable():
    with pytest.raises(UnparsableFileError):
        load_dataframe("releve.xml", b"<transactions><transaction></transactions>")


# --- PDF texte natif (extraction de tableau via pdfplumber) ---------------


def _build_native_table_pdf_bytes() -> bytes:
    """PDF avec une vraie couche texte + un tableau à bordures dessinées
    (pdfplumber.extract_table() a besoin de lignes visibles pour détecter la
    grille) — construit en mémoire avec PyMuPDF, aucune fixture binaire
    committée."""
    doc = fitz.open()
    page = doc.new_page(width=400, height=200)
    cols = [20, 200, 380]
    rows = [20, 60, 100]
    for x in cols:
        page.draw_line(fitz.Point(x, rows[0]), fitz.Point(x, rows[-1]))
    for y in rows:
        page.draw_line(fitz.Point(cols[0], y), fitz.Point(cols[-1], y))
    page.insert_text((30, 45), "Date", fontsize=12)
    page.insert_text((210, 45), "Montant", fontsize=12)
    page.insert_text((30, 85), "01/06/2024", fontsize=12)
    page.insert_text((210, 85), "150.00", fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_load_dataframe_pdf_native_table_nominal():
    """Régression : le chemin PDF texte natif (extract_table) doit continuer
    de fonctionner sans jamais passer par le repli OCR."""
    content = _build_native_table_pdf_bytes()
    df = load_dataframe("releve.pdf", content)
    assert list(df.columns) == ["Date", "Montant"]

    rows = map_and_validate(df)
    assert len(rows) == 1
    assert rows[0].status == "validated"
    assert rows[0].date == date(2024, 6, 1)
    assert rows[0].amount == 150.0


# --- PDF scanné (repli OCR, Phase 2) ---------------------------------------


def _tesseract_available() -> bool:
    if shutil.which("tesseract") is not None:
        return True
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _build_scanned_pdf_bytes(lines: list[str]) -> bytes:
    """PDF scanné de test : image (PIL, sans couche texte) insérée dans un
    PDF via PyMuPDF — simule un relevé passé au scanner."""
    from PIL import Image, ImageDraw, ImageFont

    width, height = 900, 60 + 50 * len(lines)
    image = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font = ImageFont.load_default()

    y = 20
    for line in lines:
        draw.text((20, y), line, fill="black", font=font)
        y += 50

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")

    doc = fitz.open()
    page = doc.new_page(width=width, height=height)
    page.insert_image(fitz.Rect(0, 0, width, height), stream=buffer.getvalue())
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_extract_ocr_transaction_row_amount_and_date():
    row = _extract_ocr_transaction_row("01/06/2024  Epicerie Metro   150,00 $")
    assert row["Date"] == "01/06/2024"
    assert row["Description"] == "Epicerie Metro"
    assert _parse_amount(row["Montant"]) == 150.0


def test_extract_ocr_transaction_row_noise_line_ignored():
    # Ni date ni montant détectable -> bruit OCR, ignoré (compromis assumé,
    # voir docstring de _read_pdf_scanned_via_ocr).
    assert _extract_ocr_transaction_row("relevé bancaire mensuel") is None


@pytest.mark.skipif(
    not _tesseract_available(), reason="Tesseract non installé sur cette machine"
)
def test_load_dataframe_pdf_scanned_ocr_extracts_transaction():
    content = _build_scanned_pdf_bytes(["01/06/2024 Epicerie Metro 150,00 $"])

    df = load_dataframe("releve_scanne.pdf", content)
    assert len(df) >= 1

    rows = map_and_validate(df)
    assert any(r.amount == 150.0 for r in rows)


def test_load_dataframe_pdf_scanned_without_tesseract_raises_unparsable(monkeypatch):
    """Doit passer que Tesseract soit installé ou non sur cette machine : on
    simule son absence en forçant pytesseract à lever
    TesseractNotFoundError, pour vérifier que ce cas précis est traduit en
    UnparsableFileError propre plutôt que de laisser remonter une trace
    Python brute."""

    def _raise_not_found(*args, **kwargs):
        raise pytesseract.pytesseract.TesseractNotFoundError()

    monkeypatch.setattr(pytesseract, "image_to_string", _raise_not_found)

    content = _build_scanned_pdf_bytes(["01/06/2024 Epicerie Metro 150,00 $"])
    with pytest.raises(UnparsableFileError, match="Tesseract"):
        load_dataframe("releve_scanne.pdf", content)
