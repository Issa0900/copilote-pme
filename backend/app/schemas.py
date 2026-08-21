import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.constants import OBJECTIVE_CHOICES, REVENUE_RANGE_CHOICES


class CompanyBase(BaseModel):
    name: str
    sector: str
    location: str
    employees: int
    business_model: str | None = None
    products: str | None = None
    services: str | None = None
    customers: str | None = None
    suppliers: str | None = None
    revenue_range: str | None = None
    tools_used: str | None = None
    objectives: list[str] | None = None

    @field_validator("objectives")
    @classmethod
    def validate_objectives(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        invalid = set(value) - set(OBJECTIVE_CHOICES)
        if invalid:
            raise ValueError(f"objectifs invalides: {sorted(invalid)}")
        return value

    @field_validator("revenue_range")
    @classmethod
    def validate_revenue_range(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in REVENUE_RANGE_CHOICES:
            raise ValueError(f"fourchette de chiffre d'affaires invalide: {value}")
        return value

    @field_validator("employees")
    @classmethod
    def validate_employees(cls, value: int) -> int:
        if value < 0:
            raise ValueError("le nombre d'employés ne peut pas être négatif")
        return value


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = None
    sector: str | None = None
    location: str | None = None
    employees: int | None = None
    business_model: str | None = None
    products: str | None = None
    services: str | None = None
    customers: str | None = None
    suppliers: str | None = None
    revenue_range: str | None = None
    tools_used: str | None = None
    objectives: list[str] | None = None


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    email: str
    created_at: datetime
    updated_at: datetime


class UserRegister(CompanyBase):
    """Inscription : crée l'entreprise et son premier utilisateur en une
    fois. Réutilise les champs de CompanyBase (mêmes validations
    objectives/revenue_range) et ajoute les identifiants du compte."""

    email: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("le mot de passe doit contenir au moins 8 caractères")
        return value


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ImportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    source_type: str
    file_name: str
    uploaded_at: datetime
    status: str
    quality_score: float | None
    rows_processed: int
    rows_quarantined: int
    error_message: str | None


class CompanyKpis(BaseModel):
    revenue_total: float
    expenses_total: float
    net_result: float
    transactions_count: int
    average_sale: float | None
    quarantined_count: int
    period_start: date | None
    period_end: date | None


class AnomalyRead(BaseModel):
    type: str
    severity: str
    message: str
    category: str | None
    transaction_id: str | None
    detected_at: date | None


class DailyKpiPoint(BaseModel):
    date: date
    net: float


class CategoryBreakdownItem(BaseModel):
    category: str
    total: float


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    type: str
    period: date
    generated_at: datetime
    summary: str
    content: dict


RECOMMENDATION_STATUSES = {"nouvelle", "acceptee", "rejetee"}


class RecommendationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    type: str
    category: str | None
    situation: str
    analysis: str
    impact: str
    action: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime


class RecommendationUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in RECOMMENDATION_STATUSES:
            raise ValueError(f"statut invalide: {value}")
        return value


class AlertRead(BaseModel):
    level: str
    title: str
    message: str
    source: str
    source_id: str | None
    category: str | None


class AlertSummaryItem(BaseModel):
    level: str
    count: int


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    import_id: uuid.UUID
    date: date | None
    amount: float | None
    category: str | None
    description: str | None
    status: str
    quarantine_reasons: list[str] | None
