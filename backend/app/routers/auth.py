from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models import Company, User
from app.schemas import TokenResponse, UserLogin, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenResponse:
    """Crée une Company et son premier User dans la même transaction, puis
    retourne un token immédiatement utilisable. La création d'entreprise ne
    passe plus que par cette route (POST /companies a été retirée, cf.
    routers/companies.py)."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Cet email est déjà utilisé")

    company_fields = payload.model_dump(exclude={"email", "password"})
    company = Company(**company_fields)
    db.add(company)
    db.flush()  # pour obtenir company.id sans commit prématuré

    user = User(
        company_id=company.id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()

    # Message générique volontaire (401 dans les deux cas) pour ne pas
    # révéler si c'est l'email ou le mot de passe qui est incorrect —
    # évite l'énumération de comptes.
    invalid_credentials = HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if user is None:
        raise invalid_credentials
    if not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials

    return TokenResponse(access_token=create_access_token(user))
