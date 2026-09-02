from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.audit import log_login_failed, log_login_success, log_register
from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models import Company, User
from app.rate_limit import limiter
from app.schemas import TokenResponse, UserLogin, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


# VULN-005 : /auth/register est la cible d'énumération d'emails (le 409
# "déjà utilisé" révèle si une PME a un compte) — une inscription légitime
# n'a besoin d'être tentée qu'une fois, donc un seuil bas (par IP) suffit à
# ralentir fortement l'énumération sans jamais gêner un usage normal.
@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, payload: UserRegister, db: Session = Depends(get_db)) -> TokenResponse:
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

    log_register(user.id, company.id)
    return TokenResponse(access_token=create_access_token(user))


# VULN-005 : brute-force / credential stuffing sur /auth/login. 10/minute
# par IP ralentit fortement un brute-force de mot de passe (au mieux ~14
# 400 essais/jour par IP au lieu d'illimité) tout en laissant une marge
# confortable à un utilisateur légitime qui se trompe plusieurs fois de
# suite. Throttling par email envisagé en plus (recommandation de la revue
# de sécurité pour le credential stuffing distribué sur plusieurs IPs) mais
# écarté pour ce correctif : le stockage en mémoire de slowapi ne permet
# une clé par email fiable qu'en mono-process, et une vraie protection
# multi-instance demanderait un backend partagé (Redis) qui n'existe pas
# encore dans ce projet. Limitation par IP seule pour l'instant — à
# revisiter si Redis entre dans la stack.
@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()

    # Message générique volontaire (401 dans les deux cas) pour ne pas
    # révéler si c'est l'email ou le mot de passe qui est incorrect —
    # évite l'énumération de comptes.
    invalid_credentials = HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    # Spec §64.25 : les echecs de connexion sont journalises (une serie
    # d'echecs est le signal d'attaque le plus elementaire). Le journal
    # distingue "email inconnu" de "mot de passe invalide" — cette distinction
    # reste interne, la reponse HTTP demeure volontairement identique dans les
    # deux cas. Le mot de passe fourni n'est jamais journalise.
    if user is None:
        log_login_failed(payload.email, "unknown_email")
        raise invalid_credentials
    if not verify_password(payload.password, user.hashed_password):
        log_login_failed(payload.email, "bad_password")
        raise invalid_credentials

    log_login_success(user.id, user.company_id)
    return TokenResponse(access_token=create_access_token(user))
