import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_company_access
from app.database import get_db
from app.models import Company, User
from app.schemas import CompanyRead, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])

# POST "" (création libre d'une entreprise, sans utilisateur associé) a été
# retirée : la création d'entreprise ne passe plus que par POST /auth/register,
# qui crée la Company ET son premier User dans la même transaction (VULN-001/002).

# GET "" (liste de toutes les entreprises de tous les tenants, VULN-002) a été
# retirée au profit de GET /companies/me, qui ne peut jamais renvoyer que
# l'entreprise de l'utilisateur courant — un user = une company au MVP, une
# liste n'aurait donc jamais eu plus d'un élément honnête à renvoyer.


@router.get("/me", response_model=CompanyRead)
def get_my_company(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> Company:
    company = db.get(Company, current_user.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_company_access),
) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: uuid.UUID,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_company_access),
) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company
