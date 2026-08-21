"""Pipeline d'ingestion MVP (PRD section 8.8) : CSV, XLSX, XLS, TSV, PDF texte natif."""

import io
import re
import unicodedata
from dataclasses import dataclass
from datetime import date

import pandas as pd
import pdfplumber

SUPPORTED_EXTENSIONS = {"csv", "tsv", "xlsx", "xls", "pdf"}

DATE_SYNONYMS = {"date", "transactiondate", "datetransaction", "jour"}
AMOUNT_SYNONYMS = {"montant", "amount", "total", "prix", "price"}
CATEGORY_SYNONYMS = {"categorie", "category", "type", "typedetransaction"}
DESCRIPTION_SYNONYMS = {
    "description",
    "libelle",
    "client",
    "customer",
    "produit",
    "item",
    "fournisseur",
}


class UnsupportedFileError(ValueError):
    pass


class UnparsableFileError(ValueError):
    pass


@dataclass
class MappedRow:
    date: date | None
    amount: float | None
    category: str | None
    description: str | None
    status: str
    quarantine_reasons: list[str]
    raw_data: dict


def get_extension(filename: str) -> str:
    if "." not in filename:
        raise UnsupportedFileError("Le fichier n'a pas d'extension reconnaissable.")
    ext = filename.rsplit(".", 1)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileError(
            f"Format .{ext} non supporté au MVP. Formats supportés : "
            f"{', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )
    return ext


def _normalize_header(header: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(header))
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    return normalized.strip().lower().replace(" ", "").replace("_", "")


def _read_tabular(ext: str, content: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    if ext == "csv":
        return pd.read_csv(buffer, sep=None, engine="python")
    if ext == "tsv":
        return pd.read_csv(buffer, sep="\t")
    if ext in ("xlsx", "xls"):
        # MVP : seule la première feuille est traitée (feuilles multiples = amélioration future).
        return pd.read_excel(buffer, sheet_name=0)
    raise UnsupportedFileError(f"Extension tabulaire inattendue: {ext}")


def _read_pdf_table(content: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    with pdfplumber.open(buffer) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table and len(table) > 1:
                header, *rows = table
                return pd.DataFrame(rows, columns=header)
    raise UnparsableFileError(
        "Aucun tableau détecté dans ce PDF. Seuls les PDF texte natifs contenant un "
        "tableau structuré sont supportés au MVP (l'OCR arrive en Phase 2)."
    )


def load_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    ext = get_extension(filename)
    try:
        if ext == "pdf":
            return _read_pdf_table(content)
        return _read_tabular(ext, content)
    except UnparsableFileError:
        raise
    except Exception as exc:  # fichier corrompu/illisible (PRD 8.6)
        raise UnparsableFileError(
            "Fichier corrompu ou illisible. Veuillez vérifier le fichier ou le "
            "réexporter depuis sa source d'origine."
        ) from exc


def _map_columns(columns: list[str]) -> dict[str, str | None]:
    normalized = {col: _normalize_header(col) for col in columns}
    mapping: dict[str, str | None] = {
        "date": None,
        "amount": None,
        "category": None,
        "description": None,
    }
    for original, norm in normalized.items():
        if mapping["date"] is None and norm in DATE_SYNONYMS:
            mapping["date"] = original
        elif mapping["amount"] is None and norm in AMOUNT_SYNONYMS:
            mapping["amount"] = original
        elif mapping["category"] is None and norm in CATEGORY_SYNONYMS:
            mapping["category"] = original
        elif mapping["description"] is None and norm in DESCRIPTION_SYNONYMS:
            mapping["description"] = original
    return mapping


def _parse_amount(raw) -> float | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    text = text.replace("$", "").replace(" ", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


_ISO_DATE_RE = re.compile(r"^\d{4}-\d{1,2}-\d{1,2}([T ].*)?$")


def _parse_date(raw) -> date | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    if isinstance(raw, str) and _ISO_DATE_RE.match(raw.strip()):
        # Format ISO (AAAA-MM-JJ) non ambigu : dayfirst inverserait à tort
        # mois et jour (ex. 2026-07-01 lu comme le 7 janvier 2026).
        parsed = pd.to_datetime(raw, errors="coerce")
    else:
        # Marché cible Québec/Canada : format JJ/MM/AAAA pour les dates ambiguës.
        parsed = pd.to_datetime(raw, errors="coerce", dayfirst=True)
    if pd.isna(parsed):
        return None
    return parsed.date()


def map_and_validate(df: pd.DataFrame) -> list[MappedRow]:
    column_map = _map_columns(list(df.columns))
    today = date.today()
    mapped_rows: list[MappedRow] = []

    for _, row in df.iterrows():
        raw_data = {str(k): (None if pd.isna(v) else str(v)) for k, v in row.items()}

        raw_date = row[column_map["date"]] if column_map["date"] else None
        raw_amount = row[column_map["amount"]] if column_map["amount"] else None
        raw_category = row[column_map["category"]] if column_map["category"] else None
        raw_description = (
            row[column_map["description"]] if column_map["description"] else None
        )

        parsed_date = _parse_date(raw_date)
        parsed_amount = _parse_amount(raw_amount)
        category = None if raw_category is None or pd.isna(raw_category) else str(raw_category)
        description = (
            None if raw_description is None or pd.isna(raw_description) else str(raw_description)
        )

        reasons: list[str] = []
        if column_map["date"] is None or parsed_date is None:
            reasons.append("date manquante ou illisible")
        elif parsed_date > today:
            reasons.append("date de transaction future")

        if column_map["amount"] is None or parsed_amount is None:
            reasons.append("montant manquant ou illisible")

        status = "quarantined" if reasons else "validated"

        mapped_rows.append(
            MappedRow(
                date=parsed_date,
                amount=parsed_amount,
                category=category,
                description=description,
                status=status,
                quarantine_reasons=reasons,
                raw_data=raw_data,
            )
        )

    return mapped_rows
