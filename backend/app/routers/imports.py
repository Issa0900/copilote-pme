import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit import log_import_created, log_import_deleted
from app.auth import require_company_access
from app.database import get_db
from app.ingestion import (
    PROFILES,
    UnparsableFileError,
    UnsupportedFileError,
    find_unrecognized_columns,
    get_extension,
    load_dataframe,
    map_and_validate,
)
from app.models import Company, Import, Transaction, User
from app.schemas import ImportCreateRead, ImportRead, TransactionRead

router = APIRouter(
    prefix="/companies/{company_id}/imports",
    tags=["imports"],
    dependencies=[Depends(require_company_access)],
)

# PRD 8.6 : limite de taille de fichier au MVP (protection contre l'épuisement
# mémoire par upload volumineux avant toute validation de contenu).
MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024  # 10 Mo
_READ_CHUNK_SIZE = 1024 * 1024  # 1 Mo

# Pagination (spec §64.24). La forme de la réponse reste un tableau JSON — le
# frontend consomme déjà ces routes comme des listes — donc le total réel est
# publié dans l'en-tête `X-Total-Count`, ce qui permettra plus tard d'afficher
# « N sur M » sans changer le contrat.
#
# Historique des imports : un import correspond à un fichier téléversé
# manuellement, donc quelques dizaines par an au plus pour une PME. 100 couvre
# largement l'affichage courant, 500 borne le pire cas sans jamais rogner des
# données réelles.
DEFAULT_IMPORTS_LIMIT = 100
MAX_IMPORTS_LIMIT = 500

# Transactions d'un import : c'est la liste la plus volumineuse du produit (un
# seul fichier peut contenir des dizaines de milliers de lignes). Défaut
# volontairement bas — une page de tableau — et plafond serré, sinon un
# `limit=999999` reproduirait exactement le problème que la pagination corrige.
DEFAULT_IMPORT_TRANSACTIONS_LIMIT = 200
MAX_IMPORT_TRANSACTIONS_LIMIT = 1000


def _get_company_or_404(company_id: uuid.UUID, db: Session) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


def _normalize_amount(amount) -> float | None:
    """Normalise un montant (Decimal venant de la DB ou float en mémoire)
    pour une comparaison exacte fiable dans la clé de déduplication."""
    return round(float(amount), 2) if amount is not None else None


def _import_response(
    import_record: Import, *, unrecognized_columns: list[str], duplicates_skipped: int
) -> ImportCreateRead:
    """Assemble la réponse de création d'import : l'enregistrement persisté,
    augmenté des deux informations de transparence (colonnes inconnues,
    doublons écartés) qui ne sont volontairement pas stockées en base."""
    response = ImportCreateRead.model_validate(import_record)
    response.unrecognized_columns = unrecognized_columns
    response.duplicates_skipped = duplicates_skipped
    return response


def _read_upload_within_limit(file: UploadFile, max_size: int) -> bytes:
    """Lit le fichier téléversé par blocs et interrompt dès que la limite est
    dépassée, plutôt que de charger un fichier arbitrairement volumineux en
    mémoire avant de le vérifier.

    Lecture synchrone via `file.file` (le SpooledTemporaryFile sous-jacent) :
    à ce stade, Starlette a déjà entièrement reçu et écrit le corps de la
    requête multipart dans ce fichier avant d'appeler la route (que celle-ci
    soit `async def` ou `def`), donc une lecture bloquante standard ici est
    sûre et ne perd aucune donnée."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = file.file.read(_READ_CHUNK_SIZE)
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


# Route volontairement synchrone (pas `async def`) : `create_import` exécute
# du travail CPU-bound (parsing pandas, boucle de validation ligne à ligne)
# et des accès DB synchrones (psycopg2, driver bloquant). Dans une route
# `async def`, ce travail bloquerait la boucle d'événements asyncio unique
# de uvicorn et gèlerait TOUTES les requêtes concurrentes (y compris
# /health) le temps du traitement — reproduit en conditions réelles avec un
# import de 60k lignes (16s de latence sur /health pendant l'import). En
# route `def` synchrone, FastAPI délègue automatiquement l'exécution à un
# thread du threadpool de Starlette, libérant la boucle d'événements pour
# les autres requêtes.
@router.post("", response_model=ImportCreateRead, status_code=201)
def create_import(
    company_id: uuid.UUID,
    file: UploadFile,
    profile: str = Form("generique"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_access),
) -> ImportCreateRead:
    _get_company_or_404(company_id, db)

    if profile not in PROFILES:
        raise HTTPException(
            status_code=422,
            detail=f"Profil d'import inconnu : {profile}. Attendu : {', '.join(sorted(PROFILES))}.",
        )

    try:
        ext = get_extension(file.filename or "")
    except UnsupportedFileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    content = _read_upload_within_limit(file, MAX_IMPORT_FILE_SIZE)

    import_record = Import(
        company_id=company_id,
        source_type=ext,
        profile=profile,
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
        log_import_created(
            current_user.id,
            company_id,
            import_record.id,
            status=import_record.status,
            rows_processed=0,
            rows_quarantined=0,
            duplicates_skipped=0,
        )
        # Fichier illisible : aucune colonne n'a pu etre lue, il n'y a donc
        # rien a signaler comme "colonne inconnue".
        return _import_response(import_record, unrecognized_columns=[], duplicates_skipped=0)

    # Spec §64.5 : les colonnes qu'aucun synonyme ne reconnait etaient ecartees
    # en silence. Elles sont desormais remontees dans la reponse de l'import.
    unrecognized_columns = find_unrecognized_columns(list(df.columns), profile=profile)

    mapped_rows = map_and_validate(df, profile=profile)

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
    # Spec §64.19 : `duplicate_count` (lignes exclues de l'insertion ci-dessus)
    # était calculé puis jeté — l'utilisateur ne savait jamais combien de
    # lignes avaient été écartées comme déjà présentes. Il est désormais
    # renvoyé dans la réponse HTTP. Il n'est toujours PAS persisté : le modèle
    # Import n'a pas de colonne dédiée et l'ajouter demande une migration
    # (hors périmètre de ce lot, cf. docstring de ImportCreateRead).

    db.commit()
    db.refresh(import_record)

    log_import_created(
        current_user.id,
        company_id,
        import_record.id,
        status=import_record.status,
        rows_processed=import_record.rows_processed,
        rows_quarantined=import_record.rows_quarantined,
        duplicates_skipped=duplicate_count,
    )
    return _import_response(
        import_record,
        unrecognized_columns=unrecognized_columns,
        duplicates_skipped=duplicate_count,
    )


@router.get("", response_model=list[ImportRead])
def list_imports(
    company_id: uuid.UUID,
    response: Response,
    limit: int = Query(DEFAULT_IMPORTS_LIMIT, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[Import]:
    _get_company_or_404(company_id, db)
    # Le plafond est appliqué en silence plutôt qu'en 422 : un client qui
    # demande trop obtient une page bornée, jamais la table entière, et
    # `X-Total-Count` lui dit combien il en reste.
    limit = min(limit, MAX_IMPORTS_LIMIT)

    base = db.query(Import).filter(Import.company_id == company_id)
    # Total AVANT découpage : `X-Total-Count` porte le nombre réel d'éléments,
    # pas la taille de la page renvoyée.
    response.headers["X-Total-Count"] = str(
        base.with_entities(func.count(Import.id)).scalar() or 0
    )
    # Découpage en SQL (`.limit()/.offset()`), pas un `.all()` suivi d'un slice
    # Python : c'est la base qui doit cesser de renvoyer les lignes en trop.
    return base.order_by(Import.uploaded_at.desc()).limit(limit).offset(offset).all()


@router.get("/{import_id}/transactions", response_model=list[TransactionRead])
def list_import_transactions(
    company_id: uuid.UUID,
    import_id: uuid.UUID,
    response: Response,
    limit: int = Query(DEFAULT_IMPORT_TRANSACTIONS_LIMIT, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[Transaction]:
    _get_company_or_404(company_id, db)
    limit = min(limit, MAX_IMPORT_TRANSACTIONS_LIMIT)

    base = db.query(Transaction).filter(
        Transaction.company_id == company_id, Transaction.import_id == import_id
    )
    response.headers["X-Total-Count"] = str(
        base.with_entities(func.count(Transaction.id)).scalar() or 0
    )
    # Tri sur (date, id) : `date` seule n'est pas unique (un import contient
    # typiquement plusieurs lignes du même jour) et un ORDER BY non
    # déterministe ferait réapparaître ou disparaître des lignes d'une page à
    # l'autre.
    return (
        base.order_by(Transaction.date.desc().nulls_last(), Transaction.id)
        .limit(limit)
        .offset(offset)
        .all()
    )


@router.delete("/{import_id}", status_code=204)
def delete_import(
    company_id: uuid.UUID,
    import_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_access),
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

    deleted_transactions = (
        db.query(Transaction)
        .filter(Transaction.company_id == company_id, Transaction.import_id == import_id)
        .delete(synchronize_session=False)
    )
    db.delete(import_record)
    db.commit()

    # Spec §64.25 : action la plus destructive de l'API (suppression en masse
    # de transactions) — elle ne laissait aucune trace jusqu'ici.
    log_import_deleted(
        current_user.id,
        company_id,
        import_id,
        transactions_deleted=deleted_transactions,
    )
