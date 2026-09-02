"""Jeu de données de démonstration.

Crée une entreprise complète (PME québécoise fictive), son utilisateur, un
import et ~6 mois de transactions plausibles : saisonnalité hebdomadaire,
tendance de fond, catégories de dépenses récurrentes, quelques lignes en
quarantaine, et une dérive volontaire sur une catégorie pour que le détecteur
d'anomalies ait réellement quelque chose à trouver.

Usage (depuis backend/) :

    ./.venv/Scripts/python.exe -m scripts.seed_demo

Relancer le script recrée l'entreprise de démo à neuf (les données précédentes
portant le même courriel sont supprimées d'abord) — il est donc rejouable sans
accumuler de doublons.
"""

import random
import sys
import uuid
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.database import SessionLocal
from app.models import Company, Import, Transaction, User

DEMO_EMAIL = "demo@gescop.test"
DEMO_PASSWORD = "demo-gescop-2026"

# Catégories de revenus / dépenses d'un café-boulangerie : montants et
# fréquences choisis pour rester crédibles à l'échelle d'une PME.
REVENUE_CATEGORIES = [
    ("Ventes comptoir", 8, 45),
    ("Ventes en ligne", 2, 120),
    ("Traiteur", 1, 450),
]
# Calibré pour une PME réellement viable (~20 % de marge nette hors dérive) :
# une démo où l'entreprise perd de l'argent dès le premier écran donnerait un
# score de santé au plancher et masquerait le vrai sujet — la dérive sur les
# fournitures introduite plus bas, que le détecteur doit faire ressortir.
EXPENSE_CATEGORIES = [
    ("Fournitures", 2, 110),
    ("Salaires", 1, 380),
    ("Loyer", 0, 0),  # traité à part : mensuel
    ("Entretien", 1, 55),
    ("Marketing", 1, 60),
]

MONTHLY_RENT = 3200.0
DAYS = 180


def _clear_previous(db: Session) -> None:
    user = db.query(User).filter(User.email == DEMO_EMAIL).one_or_none()
    if user is None:
        return
    company_id = user.company_id
    db.query(Transaction).filter(Transaction.company_id == company_id).delete()
    db.query(Import).filter(Import.company_id == company_id).delete()
    db.query(User).filter(User.company_id == company_id).delete()
    db.query(Company).filter(Company.id == company_id).delete()
    db.commit()


def _seasonality(day: date) -> float:
    """Facteur d'activité : creux le début de semaine, pic vendredi/samedi."""
    return [0.75, 0.8, 0.9, 1.0, 1.35, 1.5, 0.6][day.weekday()]


def seed(seed_value: int = 20260901) -> None:
    rng = random.Random(seed_value)
    db: Session = SessionLocal()

    try:
        _clear_previous(db)

        company = Company(
            id=uuid.uuid4(),
            name="Café Lumière",
            sector="Boulangerie-pâtisserie",
            location="Québec, QC",
            employees=9,
            business_model="Commerce de détail avec service de traiteur",
            products="Pains, viennoiseries, pâtisseries, café",
            services="Traiteur événementiel, commandes en ligne",
            customers="Particuliers du quartier, bureaux, événements privés",
            suppliers="Moulin Laurentides, Torréfaction Saint-Roch, Ferme Bélanger",
            revenue_range="250k-1m",
            tools_used="Square (caisse), Acomba (comptabilité), Excel",
            objectives=["ameliorer_la_rentabilite", "reduire_les_couts"],
            target_margin_pct=18,
            revenue_target=520000,
            expense_budget=430000,
            health_healthy_threshold=80,
        )
        db.add(company)
        db.flush()

        db.add(
            User(
                company_id=company.id,
                email=DEMO_EMAIL,
                hashed_password=hash_password(DEMO_PASSWORD),
            )
        )

        imp = Import(
            company_id=company.id,
            source_type="csv",
            profile="ventes_pos",
            file_name="ventes_square_6_mois.csv",
            uploaded_by=DEMO_EMAIL,
            status="complete",
            quality_score=94.5,
            rows_processed=0,
            rows_quarantined=0,
        )
        db.add(imp)
        db.flush()

        today = date.today()
        start = today - timedelta(days=DAYS - 1)
        transactions: list[Transaction] = []

        for offset in range(DAYS):
            day = start + timedelta(days=offset)
            season = _seasonality(day)
            # Croissance de fond ~+12 % sur la période, bruitée.
            trend = 1 + (offset / DAYS) * 0.12

            for label, base_count, avg in REVENUE_CATEGORIES:
                count = max(0, int(rng.gauss(base_count * season, 1.2)))
                for _ in range(count):
                    amount = round(max(5.0, rng.gauss(avg, avg * 0.25)) * trend, 2)
                    transactions.append(
                        Transaction(
                            company_id=company.id,
                            import_id=imp.id,
                            date=day,
                            amount=amount,
                            category=label,
                            description=f"{label} — {day.isoformat()}",
                            status="validated",
                            raw_data={"source": "demo"},
                        )
                    )

            for label, base_count, avg in EXPENSE_CATEGORIES:
                if label == "Loyer":
                    continue
                count = max(0, int(rng.gauss(base_count * season, 0.8)))
                # Dérive volontaire sur les fournitures dans le dernier mois :
                # donne au détecteur d'anomalies un vrai signal à remonter.
                drift = 1.9 if (label == "Fournitures" and offset > DAYS - 30) else 1.0
                for _ in range(count):
                    amount = round(max(5.0, rng.gauss(avg, avg * 0.3)) * drift, 2)
                    transactions.append(
                        Transaction(
                            company_id=company.id,
                            import_id=imp.id,
                            date=day,
                            amount=-amount,
                            category=label,
                            description=f"{label} — {day.isoformat()}",
                            status="validated",
                            raw_data={"source": "demo"},
                        )
                    )

            if day.day == 1:
                transactions.append(
                    Transaction(
                        company_id=company.id,
                        import_id=imp.id,
                        date=day,
                        amount=-MONTHLY_RENT,
                        category="Loyer",
                        description=f"Loyer {day.strftime('%B %Y')}",
                        status="validated",
                        raw_data={"source": "demo"},
                    )
                )

        # Quelques lignes réellement inexploitables (date ou montant manquant),
        # pour que la quarantaine et le score de qualité ne soient pas vides.
        for i in range(11):
            transactions.append(
                Transaction(
                    company_id=company.id,
                    import_id=imp.id,
                    date=None if i % 2 == 0 else today - timedelta(days=i),
                    amount=None if i % 2 == 1 else -42.0,
                    category=None,
                    description="Ligne illisible dans l'export",
                    status="quarantined",
                    quarantine_reasons=["date_invalide" if i % 2 == 0 else "montant_invalide"],
                    raw_data={"source": "demo", "ligne": i},
                )
            )

        db.add_all(transactions)

        validated = sum(1 for t in transactions if t.status == "validated")
        quarantined = len(transactions) - validated
        imp.rows_processed = validated
        imp.rows_quarantined = quarantined

        db.commit()

        print(f"Entreprise    : {company.name} ({company.id})")
        print(f"Connexion     : {DEMO_EMAIL} / {DEMO_PASSWORD}")
        print(f"Transactions  : {validated} validées, {quarantined} en quarantaine")
        # Pas de caractère hors cp1252 dans les prints : la console Windows par
        # défaut ne sait pas les encoder et ferait échouer le script à la
        # toute fin, après un commit pourtant réussi.
        print(f"Periode       : {start} - {today}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    sys.exit(0)
