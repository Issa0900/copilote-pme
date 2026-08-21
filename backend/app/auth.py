"""Authentification (PRD section 43).

Auth stateless par JWT bearer token : pas de session serveur, plus simple à
relayer depuis des server actions Next.js côté frontend. Chaque utilisateur
appartient à exactement une Company (MVP, pas de multi-organisation par
utilisateur) — c'est cette frontière qui sert de séparation stricte entre
organisations (correctif VULN-002 : `require_company_access`).

Mot de passe haché avec argon2 (argon2-cffi), recommandé pour du neuf plutôt
que bcrypt/passlib. Jamais stocké ni comparé en clair.
"""

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

_password_hasher = PasswordHasher()

# tokenUrl pointe vers /auth/login uniquement pour la doc OpenAPI (Swagger
# "Authorize") — l'endpoint accepte un JSON {email, password}, pas le
# form-encoded classique attendu par OAuth2PasswordRequestForm.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return _password_hasher.verify(hashed_password, password)
    except VerifyMismatchError:
        return False


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        # company_id inclus dans les claims pour éviter une requête DB
        # supplémentaire à chaque appel protégé.
        "company_id": str(user.company_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Identifiants invalides ou expirés",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    if token is None:
        raise _CREDENTIALS_ERROR

    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError:
        raise _CREDENTIALS_ERROR from None

    user_id = payload.get("sub")
    if user_id is None:
        raise _CREDENTIALS_ERROR

    try:
        user = db.get(User, uuid.UUID(user_id))
    except ValueError:
        raise _CREDENTIALS_ERROR from None

    if user is None:
        raise _CREDENTIALS_ERROR

    return user


def require_company_access(
    company_id: uuid.UUID, current_user: User = Depends(get_current_user)
) -> User:
    """Empêche un utilisateur authentifié d'accéder aux données d'une autre
    entreprise que la sienne (correctif VULN-002). `company_id` est résolu
    depuis le path param de la route protégée."""
    if current_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé à cette entreprise",
        )
    return current_user
