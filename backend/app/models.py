import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    employees: Mapped[int] = mapped_column(Integer, nullable=False)
    business_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    products: Mapped[str | None] = mapped_column(Text, nullable=True)
    services: Mapped[str | None] = mapped_column(Text, nullable=True)
    customers: Mapped[str | None] = mapped_column(Text, nullable=True)
    suppliers: Mapped[str | None] = mapped_column(Text, nullable=True)
    revenue_range: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tools_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    objectives: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    # Devise de l'entreprise. Un montant sans devise déclarée n'a pas de sens :
    # afficher « 12 500 » avec un symbole deviné revient à mentir sur l'unité
    # des chiffres (cf. spec section 64.6). On stocke le code ISO 4217 sur trois
    # caractères plutôt qu'un symbole : c'est un standard non ambigu (« $ »
    # désigne aussi bien CAD que USD), et il se transmet tel quel à
    # Intl.NumberFormat côté frontend, qui connaît déjà le symbole, la position
    # et le nombre de décimales de chaque devise. Non-nullable, par défaut CAD
    # (produit destiné au Québec, cf. docs/project-charter.md), pour que les
    # entreprises déjà en base héritent d'une devise valide sans reprise
    # manuelle.
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="CAD"
    )

    # --- Seuils de pilotage, réglables par le dirigeant --------------------
    # Le score de santé et les objectifs affichés au tableau de bord dépendent
    # de repères qui n'ont rien d'universel : une marge de 20 % est excellente
    # dans un commerce de détail et faible dans le logiciel. Ces valeurs sont
    # donc paramétrables par entreprise plutôt que codées en dur, avec des
    # valeurs par défaut explicites (cf. app/health.py).
    target_margin_pct: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, server_default="20"
    )
    revenue_target: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    expense_budget: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    # Seuil de score global (0-100) à partir duquel la situation est jugée
    # saine ; les paliers inférieurs en sont dérivés proportionnellement.
    health_healthy_threshold: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="80"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        UniqueConstraint("company_id", "type", "period", name="uq_report_company_type_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    period: Mapped[date_type] = mapped_column(Date, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)


class Import(Base):
    __tablename__ = "imports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    profile: Mapped[str] = mapped_column(String(20), nullable=False, default="generique")
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    quality_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    rows_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_quarantined: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index(
            "ix_transactions_company_status_date",
            "company_id",
            "status",
            "date",
        ),
        Index("ix_transactions_import_id", "import_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    import_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("imports.id"), nullable=False
    )
    date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="validated")
    quarantine_reasons: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False)


class Recommendation(Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        UniqueConstraint("company_id", "source_key", name="uq_recommendation_source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    source_key: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    situation: Mapped[str] = mapped_column(Text, nullable=False)
    analysis: Mapped[str] = mapped_column(Text, nullable=False)
    impact: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="nouvelle")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Action(Base):
    """Centre d'actions (PRD Module 20, spec §31/§32). Une recommandation
    devient une action quand le dirigeant décide d'agir — `recommendation_id`
    porte l'« origine » exigée par la spec.

    Pas de champ « assigné » (spec §31) : aucune fonctionnalité d'invitation
    d'équipe n'existe encore dans le produit (un seul utilisateur par
    entreprise en pratique) ; ajouter un sélecteur à une seule option
    n'aiderait personne.

    Mesure avant/après (spec §32) figée aux deux moments qui comptent : à la
    création (`baseline_*`, jamais recalculée même si les données changent
    après coup) et à la première consultation suivant l'écoulement de la
    fenêtre de suivi (`outcome_*`, gelée dès qu'elle est calculée — même
    principe que les rapports). `metric_category` porte la catégorie mesurée
    (total signé, convention déjà utilisée par
    `anomalies.py::_profit_contributors_by_category`) ; `None` signifie que
    la recommandation d'origine n'avait pas de catégorie (règle "Marge"),
    auquel cas c'est `net_margin_pct` qui est mesuré."""

    __tablename__ = "actions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recommendations.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="a_faire")
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    due_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    # "Impact estimé" (spec §31), copié de Recommendation.impact à la
    # création — snapshot au même titre que `title`/`priority` ci-dessus,
    # jamais relu en direct sur la recommandation source.
    estimated_impact: Mapped[str] = mapped_column(Text, nullable=False)

    metric_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    baseline_start: Mapped[date_type] = mapped_column(Date, nullable=False)
    baseline_end: Mapped[date_type] = mapped_column(Date, nullable=False)
    baseline_value: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    outcome_start: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    outcome_end: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    outcome_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    outcome_measured_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("ix_actions_company_status", "company_id", "status"),)
