import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.ingestion import UnparsableFileError, UnsupportedFileError, get_extension, load_dataframe, map_and_validate
from app.models import Company, Import, Transaction
from app.schemas import ImportRead, TransactionRead

router = APIRouter(prefix="/companies/{company_id}/imports", tags=["imports"])

# PRD 8.6 : limite de taille de fichier au MVP (protection contre l'épuisement
# mémoire par upload volumineux avant toute validation de contenu).
MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024  # 10 Mo
_READ_CHUNK_SIZE = 1024 * 1024  # 1 Mo


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


def _normalize_amount(amount) -> float | None:
    """Normalise un montant (Decimal venant de la DB ou float en mémoire)
    pour une comparaison exacte fiable dans la clé de déduplication."""
    return round(float(amount), 2) if amount is not None else None


async def _read_upload_within_limit(file: UploadFile, max_size: int) -> bytes:
    """Lit le fichier téléversé par blocs et interrompt dès que la limite est
    dépassée, plutôt que de charger un fichier arbitrairement volumineux en
    mémoire avant de le vérifier."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_READ_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"Fichier trop volumineux (max {max_size // (1024 * 1024)} Mo).",
            )
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("", response_model=ImportRead, status_code=201)
async def create_import(
    company_id: uuid.UUID, file: UploadFile, db: Session = Depends(get_db)
) -> Import:
    _get_company_or_404(company_id, db)

    try:
        ext = get_extension(file.filename or "")
    except UnsupportedFileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    content = await _read_upload_within_limit(file, MAX_IMPORT_FILE_SIZE)

    import_record = Import(
        company_id=company_id,
        source_type=ext,
        file_name=file.filename or "fichier",
        status="en_cours",
        rows_processed=0,
        rows_quarantined=0,
    )
    db.add(import_record)
    db.flush()

    try:
        df = load_dataframe(file.filename or "", content)
    except UnparsableFileError as exc:
        import_record.status = "echoue"
        import_record.error_message = str(exc)
        db.commit()
        db.refresh(import_record)
        return import_record

    mapped_rows = map_and_validate(df)

    # Détection de doublons (PRD 8.6 / 9.3, exigée dès le MVP) : comparaison
    # exacte sur (date, montant, description) contre les transactions déjà
    # connues de l'entreprise. Un doublon n'est pas réinséré, pour ne pas
    # gonfler artificiellement les totaux de KPI.
    existing_keys = {
        (row.date, _normalize_amount(row.amount), row.description)
        for row in db.query(Transaction.date, Transaction.amount, Transaction.description).filter(
            Transaction.company_id == company_id
        )
    }

    quarantined_count = 0
    duplicate_count = 0
    for mapped in mapped_rows:
        if mapped.status == "quarantined":
            quarantined_count += 1

        dedup_key = (mapped.date, _normalize_amount(mapped.amount), mapped.description)
        if mapped.status == "validated" and dedup_key in existing_keys:
            duplicate_count += 1
            continue  # doublon ignoré : ne pas réinsérer, ne pas fausser les KPI

        db.add(
            Transaction(
                company_id=company_id,
                import_id=import_record.id,
                date=mapped.date,
                amount=mapped.amount,
                category=mapped.category,
                description=mapped.description,
                status=mapped.status,
                quarantine_reasons=mapped.quarantine_reasons or None,
                raw_data=mapped.raw_data,
            )
        )
        existing_keys.add(dedup_key)

    total = len(mapped_rows)
    import_record.rows_processed = total
    import_record.rows_quarantined = quarantined_count
    import_record.quality_score = (
        round((total - quarantined_count) / total * 100, 2) if total > 0 else 0.0
    )
    if total == 0:
        import_record.status = "echoue"
        import_record.error_message = "Aucune ligne de donnée trouvée dans le fichier."
    elif quarantined_count > 0:
        # PRD section 36 : le statut doit refléter la présence de lignes en
        # quarantaine plutôt que de rester "complete" alors que des données
        # attendent une validation manuelle.
        import_record.status = "en_quarantaine"
    else:
        import_record.status = "complete"
    # `duplicate_count` (lignes exclues de l'insertion ci-dessus) n'est pas
    # persisté : le modèle de données Import (PRD section 36) ne prévoit pas
    # de compteur dédié aux doublons pour le MVP.

    db.commit()
    db.refresh(import_record)
    return import_record


@router.get("", response_model=list[ImportRead])
def list_imports(company_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Import]:
    _get_company_or_404(company_id, db)
    return (
        db.query(Import)
        .filter(Import.company_id == company_id)
        .order_by(Import.uploaded_at.desc())
        .all()
    )


@router.get("/{import_id}/transactions", response_model=list[TransactionRead])
def list_import_transactions(
    company_id: uuid.UUID, import_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[Transaction]:
    _get_company_or_404(company_id, db)
    return (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.import_id == import_id)
        .order_by(Transaction.date.desc().nulls_last())
        .all()
    )


@router.delete("/{import_id}", status_code=204)
def delete_import(
    company_id: uuid.UUID, import_id: uuid.UUID, db: Session = Depends(get_db)
) -> None:
    """Annule/supprime intégralement un import et les transactions qui en
    découlent (PRD 8.7). Le modèle (app/models.py) ne définit pas de
    relationship() SQLAlchemy ni de ON DELETE CASCADE sur
    Transaction.import_id : les transactions liées sont donc supprimées
    explicitement avant l'import lui-même."""
    _get_company_or_404(company_id, db)

    import_record = (
        db.query(Import)
        .filter(Import.id == import_id, Import.company_id == company_id)
        .first()
    )
    if import_record is None:
        raise HTTPException(status_code=404, detail="Import introuvable")

    db.query(Transaction).filter(
        Transaction.company_id == company_id, Transaction.import_id == import_id
    ).delete(synchronize_session=False)
    db.delete(import_record)
    db.commit()
