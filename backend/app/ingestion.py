"""Pipeline d'ingestion MVP (PRD section 8.8) : CSV, TSV, XLSX, XLS, ODS, JSON, XML,
PDF texte natif et PDF scanné (repli OCR, Phase 2 — voir `_read_pdf_scanned_via_ocr`)."""

import io
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import date

import pandas as pd
import pdfplumber
import pymupdf as fitz  # PyMuPDF (nom de module actuel ; alias "fitz" conservé par lisibilité)
import pytesseract
from PIL import Image

SUPPORTED_EXTENSIONS = {"csv", "tsv", "xlsx", "xls", "ods", "json", "xml", "pdf"}

# Repli OCR (PDF scanné) : chaque ligne de texte OCR est traitée comme une
# ligne candidate de transaction et les champs sont extraits par regex plutôt
# que par une reconstruction de tableau pixel-parfaite (peu fiable en sortie
# d'OCR brut). Voir `_read_pdf_scanned_via_ocr`.
# Bornées par (?<!\S)/(?!\S) (début/fin de token, pas juste \b) : un \b seul
# laisse le moteur regex démarrer un match AU MILIEU d'un nombre voisin (ex.
# les 3 derniers chiffres d'une date "2026" collés au groupe de milliers
# `[ ,]\d{3}` du montant suivant), produisant un montant fantôme composé de
# chiffres empruntés à deux tokens différents séparés par un simple espace.
# Voir aussi l'alternative `\d{1,3}(?:[ ,]\d{3})+|\d+` : sans le `|\d+`, un
# montant non groupé de 4+ chiffres (ex. "1200.00", pas de séparateur de
# milliers) ne matche jamais en un seul bloc — le moteur retombe sur un
# sous-match tronqué (ex. "200.00"), perdant les premiers chiffres.
_OCR_AMOUNT_PATTERN = re.compile(
    r"(?<!\S)-?\$?\s*(?:\d{1,3}(?:[ ,]\d{3})+|\d+)[.,]\d{2}\s*\$?(?!\S)"
)
_OCR_DATE_PATTERN = re.compile(
    r"(?<!\S)(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})(?!\S)"
)

PROFILES = {"generique", "ventes_pos"}

# Dates en toutes lettres ("18 juin 2026") : `pd.to_datetime` ne les
# reconnaît pas sans dépendance à la locale système (peu fiable en
# multi-plateforme/serveur, même logique que `_format_date_fr` dans
# anomalies.py). On les convertit en JJ/MM/AAAA numérique avant parsing —
# voir `_normalize_french_month_dates`. Ces exports sont plausibles pour une
# PME québécoise (saisie manuelle, export d'un logiciel qui écrit la date en
# toutes lettres).
_FR_MONTHS = {
    "janvier": 1,
    "fevrier": 2,
    "février": 2,
    "mars": 3,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "aout": 8,
    "août": 8,
    "septembre": 9,
    "octobre": 10,
    "novembre": 11,
    "decembre": 12,
    "décembre": 12,
}
_FR_MONTH_DATE_PATTERN = re.compile(
    r"(?P<day>\d{1,2})\s+(?P<month>" + "|".join(_FR_MONTHS) + r")\s+(?P<year>\d{4})",
    re.IGNORECASE,
)


def _normalize_french_month_dates(value):
    if not isinstance(value, str):
        return value
    return _FR_MONTH_DATE_PATTERN.sub(
        lambda m: f"{m.group('day')}/{_FR_MONTHS[m.group('month').lower()]:02d}/{m.group('year')}",
        value,
    )


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

# Synonymes additionnels reconnus uniquement pour le profil "ventes_pos" — en
# plus des colonnes déjà reconnues en générique (« total », « montant »...),
# on couvre les intitulés les plus courants d'un export de caisse (Square,
# Lightspeed, Clover...). Additif : n'affecte jamais le profil générique.
POS_AMOUNT_SYNONYMS = {
    "ventesnettes",
    "netsales",
    "totalcollecte",
    "totalcollected",
    "grosssales",
    "ventesbrutes",
}

# Catégorie par défaut du profil "ventes_pos" quand le fichier n'a pas de
# colonne catégorie reconnaissable : un export de caisse est par nature une
# vente. Sans ce défaut, ces transactions restent category=None et
# disparaissent silencieusement de la répartition par catégorie et du
# détecteur d'anomalies (tous deux filtrent sur category IS NOT NULL).
POS_DEFAULT_CATEGORY = "Ventes"


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
    normalized = normalized.strip().lower().replace(" ", "").replace("_", "")
    # Ne garder que les lettres : un export réel qualifie souvent la colonne
    # ("Montant ($)", "Prix (CAD)", "Total $", "Date (JJ/MM/AAAA)") — sans
    # ce nettoyage, ces variantes ne matchent aucun synonyme (tous purement
    # alphabétiques) et la colonne entière passe inaperçue, mettant 100 %
    # des lignes en quarantaine sans indice que le problème vient de l'en-tête.
    return re.sub(r"[^a-z]", "", normalized)


def _read_csv_like(buffer: io.BytesIO, **kwargs) -> pd.DataFrame:
    """Lit un CSV/TSV en essayant UTF-8 d'abord, puis Windows-1252 en repli.
    Un export Excel généré sur un poste Windows francophone (marché cible
    Québec/Canada) est très couramment encodé en Windows-1252 plutôt qu'en
    UTF-8 — sans ce repli, tout accent (é, à, û...) fait échouer la lecture
    entière avec une erreur qui ressemble à un fichier corrompu plutôt qu'à
    un simple problème d'encodage."""
    try:
        return pd.read_csv(buffer, encoding="utf-8", **kwargs)
    except UnicodeDecodeError:
        buffer.seek(0)
        return pd.read_csv(buffer, encoding="cp1252", **kwargs)


def _requarantine_malformed_lines(df: pd.DataFrame, malformed_lines: list[list[str]]) -> pd.DataFrame:
    """Réinjecte les lignes rejetées par le parseur CSV/TSV (nombre de champs
    incohérent — copié-collé malencontreux, virgule non échappée...) comme
    lignes candidates plutôt que de les laisser disparaître silencieusement.
    Le texte brut de la ligne est dupliqué dans toutes les colonnes (on ne
    connaît pas encore le mapping sémantique des colonnes à ce stade) : la
    ligne échoue naturellement au parsing date/montant plus loin
    (`map_and_validate`) et finit en quarantaine avec son contenu brut
    visible, au lieu d'être comptée nulle part."""
    if not malformed_lines or len(df.columns) == 0:
        return df
    extra_rows = [
        {col: f"[ligne malformée] {' | '.join(str(f) for f in fields)}" for col in df.columns}
        for fields in malformed_lines
    ]
    return pd.concat([df, pd.DataFrame(extra_rows)], ignore_index=True)


def _read_tabular(ext: str, content: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    if ext in ("csv", "tsv"):
        # on_bad_lines=<callable> : un export brut non nettoyé contient
        # parfois une ligne isolée avec un nombre de champs incohérent. Sans
        # ça, pandas lève une ParserError sur CETTE seule ligne et fait
        # échouer tout le fichier (UnparsableFileError), perdant les
        # centaines d'autres lignes par ailleurs valides. Le callable
        # (plutôt que "skip") permet de récupérer la ligne rejetée pour la
        # réinjecter ci-dessous — voir `_requarantine_malformed_lines`.
        # engine="python" obligatoire : callable sur on_bad_lines n'est pas
        # supporté par le moteur C de pandas.
        malformed_lines: list[list[str]] = []
        sep = None if ext == "csv" else "\t"
        df = _read_csv_like(
            buffer, sep=sep, engine="python", on_bad_lines=malformed_lines.append
        )
        return _requarantine_malformed_lines(df, malformed_lines)
    if ext in ("xlsx", "xls"):
        # MVP : seule la première feuille est traitée (feuilles multiples = amélioration future).
        return pd.read_excel(buffer, sheet_name=0)
    if ext == "ods":
        # engine="odf" explicite : lu depuis un io.BytesIO, pandas ne peut pas
        # déduire l'extension pour choisir le moteur automatiquement.
        return pd.read_excel(buffer, sheet_name=0, engine="odf")
    raise UnsupportedFileError(f"Extension tabulaire inattendue: {ext}")


def _read_json(content: bytes) -> pd.DataFrame:
    data = json.loads(content)
    if isinstance(data, list):
        return pd.DataFrame(data)
    if isinstance(data, dict):
        # Objet unique plutôt qu'un tableau : traité comme une seule transaction.
        return pd.DataFrame([data])
    raise ValueError("Le JSON doit être un tableau d'objets ou un objet unique.")


def _read_xml(content: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    # parser="etree" (stdlib ElementTree) explicite : suffisant pour le cas
    # d'usage visé (éléments répétés à plat, enfants = colonnes) et évite
    # d'ajouter lxml comme dépendance supplémentaire.
    return pd.read_xml(buffer, parser="etree")


def _render_pdf_pages_to_images(content: bytes) -> list[Image.Image]:
    """Rend chaque page du PDF en image via PyMuPDF (pas de dépendance système
    supplémentaire type poppler/ImageMagick — MuPDF est embarqué dans le
    package pip)."""
    try:
        images: list[Image.Image] = []
        with fitz.open(stream=content, filetype="pdf") as pdf:
            for page in pdf:
                pixmap = page.get_pixmap(dpi=300)
                images.append(Image.open(io.BytesIO(pixmap.tobytes("png"))))
        return images
    except Exception as exc:
        raise UnparsableFileError(
            "OCR tenté sur ce PDF scanné, mais le rendu de ses pages a échoué "
            "(fichier possiblement corrompu)."
        ) from exc


def _ocr_image_to_text(image: Image.Image) -> str:
    """OCR d'une page rendue. Marché cible francophone (Québec) avec données
    parfois en anglais -> lang="fra+eng" par défaut. Si le pack de langue
    "fra" n'est pas installé avec le binaire Tesseract, `image_to_string`
    lève un TesseractError -> repli sur l'anglais seul plutôt que de faire
    échouer tout l'import. `TesseractNotFoundError` (binaire absent) n'est
    volontairement PAS attrapée ici : elle doit remonter telle quelle pour
    être traduite en message clair par l'appelant."""
    try:
        return pytesseract.image_to_string(image, lang="fra+eng")
    except pytesseract.pytesseract.TesseractError:
        return pytesseract.image_to_string(image, lang="eng")


def _extract_ocr_transaction_row(line: str) -> dict | None:
    """Extrait date/montant/description d'une ligne de texte OCR brute par
    regex. Compromis assumé : une ligne où NI date NI montant n'est détecté
    est considérée comme du bruit OCR (pas une transaction) et ignorée ici —
    plutôt que remontée comme ligne vide en quarantaine, ce qui noierait les
    vraies quarantaines sous du bruit."""
    amount_match = _OCR_AMOUNT_PATTERN.search(line)
    date_match = _OCR_DATE_PATTERN.search(line)
    if amount_match is None and date_match is None:
        return None

    remainder = line
    if amount_match:
        remainder = remainder.replace(amount_match.group(), " ")
    if date_match:
        remainder = remainder.replace(date_match.group(), " ")
    description = re.sub(r"\s+", " ", remainder).strip(" -:|\t") or None

    return {
        "Date": date_match.group() if date_match else None,
        "Montant": amount_match.group() if amount_match else None,
        "Description": description,
    }


def _read_pdf_scanned_via_ocr(content: bytes) -> pd.DataFrame:
    """Repli OCR (Phase 2) pour un PDF scanné (image, sans texte natif) :
    rend chaque page en image (PyMuPDF), OCR chaque image (Tesseract local),
    puis extrait les transactions ligne par ligne par regex — voir
    `_extract_ocr_transaction_row`. Retombe ensuite sur le DataFrame
    Date/Montant/Description standard, traité par `map_and_validate()` comme
    n'importe quelle autre source (mapping de colonnes, quarantaine...
    inchangés)."""
    images = _render_pdf_pages_to_images(content)

    rows: list[dict] = []
    for image in images:
        try:
            text = _ocr_image_to_text(image)
        except pytesseract.pytesseract.TesseractNotFoundError as exc:
            raise UnparsableFileError(
                "OCR indisponible : Tesseract n'est pas installé sur le serveur."
            ) from exc

        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            row = _extract_ocr_transaction_row(line)
            if row is not None:
                rows.append(row)

    if not rows:
        raise UnparsableFileError(
            "OCR tenté sur ce PDF scanné, mais aucune ligne de transaction "
            "exploitable n'y a été trouvée."
        )

    return pd.DataFrame(rows)


def _read_pdf_table(content: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    with pdfplumber.open(buffer) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table and len(table) > 1:
                header, *rows = table
                return pd.DataFrame(rows, columns=header)
    # Aucun tableau texte natif trouvé sur aucune page : probablement un PDF
    # scanné (image) plutôt qu'un fichier corrompu -> on tente l'OCR avant
    # d'abandonner (voir _read_pdf_scanned_via_ocr).
    return _read_pdf_scanned_via_ocr(content)


def load_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    ext = get_extension(filename)
    try:
        if ext == "pdf":
            return _read_pdf_table(content)
        if ext == "json":
            return _read_json(content)
        if ext == "xml":
            return _read_xml(content)
        return _read_tabular(ext, content)
    except UnparsableFileError:
        raise
    except Exception as exc:  # fichier corrompu/illisible (PRD 8.6)
        raise UnparsableFileError(
            "Fichier corrompu ou illisible. Veuillez vérifier le fichier ou le "
            "réexporter depuis sa source d'origine."
        ) from exc


def _map_columns(columns: list[str], profile: str = "generique") -> dict[str, str | None]:
    amount_synonyms = AMOUNT_SYNONYMS | POS_AMOUNT_SYNONYMS if profile == "ventes_pos" else AMOUNT_SYNONYMS
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
        elif mapping["amount"] is None and norm in amount_synonyms:
            mapping["amount"] = original
        elif mapping["category"] is None and norm in CATEGORY_SYNONYMS:
            mapping["category"] = original
        elif mapping["description"] is None and norm in DESCRIPTION_SYNONYMS:
            mapping["description"] = original
    return mapping


def find_unrecognized_columns(columns: list, profile: str = "generique") -> list[str]:
    """Colonnes du fichier qu'aucun ensemble de synonymes ne reconnait (spec
    §64.5 : « les colonnes inconnues sont signalees »).

    `_map_columns` ne retient qu'une colonne par champ connu : tout le reste
    etait jusqu'ici ecarte en silence, y compris une colonne entiere de donnees
    metier. Cette fonction rend cette perte visible pour que l'API puisse la
    remonter a l'utilisateur.

    Les colonnes sans en-tete exploitable (`Unnamed: 3` genere par pandas sur
    une colonne vide d'un export Excel) sont signalees comme les autres : c'est
    justement le cas ou le dirigeant a besoin de savoir que son fichier
    contient une colonne que le systeme ne sait pas nommer."""
    mapping = _map_columns([str(col) for col in columns], profile=profile)
    recognized = {value for value in mapping.values() if value is not None}
    # Ordre du fichier conserve : plus facile a rapprocher de l'en-tete
    # original que n'importe quel tri alphabetique.
    return [str(col) for col in columns if str(col) not in recognized]


def _parse_amount(raw) -> float | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    text = text.replace("$", "").replace(" ", "")
    # Notation comptable "(120.00)" == -120.00, courante sur des exports
    # comptables bruts (Acomba, QuickBooks...). Repérée avant le strip des
    # espaces/$ ci-dessus n'aurait pas suffi si le montant est écrit
    # "( 120.00 )" ou "($120.00)" — les parenthèses restent en tête/queue
    # dans tous ces cas une fois $ et espaces retirés.
    is_negative_parens = text.startswith("(") and text.endswith(")")
    if is_negative_parens:
        text = text[1:-1]
    text = text.replace(",", ".")
    try:
        value = float(text)
    except ValueError:
        return None
    return -value if is_negative_parens else value


def _parse_date(raw) -> date | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    # Marché cible Québec/Canada : format JJ/MM/AAAA pour les dates ambiguës.
    parsed = pd.to_datetime(raw, errors="coerce", dayfirst=True)
    if pd.isna(parsed):
        return None
    return parsed.date()


def map_and_validate(df: pd.DataFrame, profile: str = "generique") -> list[MappedRow]:
    column_map = _map_columns(list(df.columns), profile=profile)
    today = date.today()
    mapped_rows: list[MappedRow] = []

    # Optimisation : `pd.to_datetime` a un overhead important par appel
    # (notoire sur de gros volumes). On le vectorise une seule fois sur toute
    # la colonne de dates plutôt que ligne par ligne dans `_parse_date` (dont
    # le comportement — dayfirst=True, NaT -> None — est reproduit ici à
    # l'identique). La logique de quarantaine/validation ligne à ligne reste
    # inchangée ci-dessous.
    if column_map["date"] is not None:
        # format="mixed" : sans lui, pandas infère UN SEUL format pour toute
        # la colonne à partir des premières valeurs — une colonne réelle
        # mélangeant JJ/MM/AAAA et AAAA-MM-JJ (fréquent sur un export brut
        # non nettoyé, ex. copié-collé de deux sources) fait alors échouer
        # silencieusement (NaT) les dates au format minoritaire, alors
        # qu'elles sont individuellement valides. "mixed" tente un format
        # par valeur au prix d'un peu de perf (accepté ici, l'essentiel du
        # gain de l'optimisation ci-dessus — éviter l'overhead par appel —
        # est conservé).
        normalized_date_col = df[column_map["date"]].apply(_normalize_french_month_dates)
        parsed_dates_series = pd.to_datetime(
            normalized_date_col, errors="coerce", dayfirst=True, format="mixed"
        )
        parsed_dates = [None if pd.isna(ts) else ts.date() for ts in parsed_dates_series]
    else:
        parsed_dates = [None] * len(df)

    for position, (_, row) in enumerate(df.iterrows()):
        raw_data = {str(k): (None if pd.isna(v) else str(v)) for k, v in row.items()}

        raw_amount = row[column_map["amount"]] if column_map["amount"] else None
        raw_category = row[column_map["category"]] if column_map["category"] else None
        raw_description = (
            row[column_map["description"]] if column_map["description"] else None
        )

        parsed_date = parsed_dates[position]
        parsed_amount = _parse_amount(raw_amount)
        category = None if raw_category is None or pd.isna(raw_category) else str(raw_category)
        if category is None and profile == "ventes_pos":
            category = POS_DEFAULT_CATEGORY
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
