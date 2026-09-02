"""Analyse d'écarts sur les KPI (PRD Module 5/6 — « pourquoi ce chiffre a bougé »).

Là où `anomalies.py` cherche des comportements statistiquement inhabituels,
ce module répond à une autre question, celle que se pose un dirigeant devant
une variation : **qu'est-ce qui explique l'écart entre cette période et la
précédente ?**

La décomposition se fait par catégorie, seule dimension que le modèle de
données porte réellement aujourd'hui. Chaque contributeur expose sa part du
mouvement total, ce qui permet des phrases du type « 3 catégories expliquent
72 % de la hausse » — vérifiables, jamais inventées.

Ce n'est pas une analyse causale : savoir qu'une catégorie porte l'écart ne
dit pas *pourquoi* elle a bougé (fournisseur, saison, prix). Le libellé côté
écran doit donc rester « facteur associé », pas « cause ».
"""

import uuid
from datetime import date as date_type

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models import Transaction
from app.schemas import KpiVariance, VarianceContributor

# Au-delà, la liste cesse d'aider à décider : on garde les contributeurs qui
# portent réellement le mouvement.
MAX_CONTRIBUTORS = 4

# Un écart de quelques dollars sur une catégorie marginale n'explique rien ;
# l'inclure diluerait les vrais facteurs.
MIN_SHARE_PCT = 5.0


def _category_totals(
    company_id: uuid.UUID,
    db: Session,
    start_date: date_type,
    end_date: date_type,
    *,
    positive: bool,
) -> dict[str, float]:
    """Total par catégorie sur une fenêtre, revenus (positive=True) ou
    dépenses (positive=False, renvoyées en valeur absolue)."""
    amount = Transaction.amount if positive else -Transaction.amount
    sign_filter = Transaction.amount > 0 if positive else Transaction.amount < 0

    rows = (
        db.query(
            Transaction.category,
            func.coalesce(func.sum(amount), 0).label("total"),
        )
        .filter(
            Transaction.company_id == company_id,
            Transaction.status == "validated",
            Transaction.category.isnot(None),
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            sign_filter,
        )
        .group_by(Transaction.category)
        .all()
    )
    return {row.category: float(row.total) for row in rows}


def compute_kpi_variance(
    company_id: uuid.UUID,
    db: Session,
    metric: str,
    current_start: date_type,
    current_end: date_type,
    previous_start: date_type,
    previous_end: date_type,
) -> KpiVariance:
    """Décompose l'écart d'un KPI entre deux périodes, par catégorie.

    `metric` vaut "revenue" ou "expenses". Le résultat liste les catégories
    qui portent le mouvement, de la plus contributrice à la moins, avec leur
    part du changement total."""
    positive = metric == "revenue"

    current_by_cat = _category_totals(
        company_id, db, current_start, current_end, positive=positive
    )
    previous_by_cat = _category_totals(
        company_id, db, previous_start, previous_end, positive=positive
    )

    current_total = sum(current_by_cat.values())
    previous_total = sum(previous_by_cat.values())
    delta = current_total - previous_total

    contributors: list[VarianceContributor] = []
    if delta != 0:
        for category in set(current_by_cat) | set(previous_by_cat):
            cat_current = current_by_cat.get(category, 0.0)
            cat_previous = previous_by_cat.get(category, 0.0)
            cat_delta = cat_current - cat_previous
            if cat_delta == 0:
                continue

            # Part du mouvement TOTAL portée par cette catégorie. Peut dépasser
            # 100 % (ou être négative) quand des catégories se compensent : une
            # hausse de 1000 sur l'une et une baisse de 800 sur l'autre donnent
            # un écart net de 200, dont la première porte 500 %. C'est
            # volontaire — c'est justement l'information utile (« la hausse est
            # masquée par une baisse ailleurs »), pas une erreur à normaliser.
            share = (cat_delta / delta) * 100
            contributors.append(
                VarianceContributor(
                    category=category,
                    current=round(cat_current, 2),
                    previous=round(cat_previous, 2),
                    delta=round(cat_delta, 2),
                    share_of_change_pct=round(share, 1),
                )
            )

        contributors.sort(key=lambda c: abs(c.delta), reverse=True)
        contributors = [
            c for c in contributors if abs(c.share_of_change_pct) >= MIN_SHARE_PCT
        ][:MAX_CONTRIBUTORS]

    return KpiVariance(
        metric=metric,
        current=round(current_total, 2),
        previous=round(previous_total, 2),
        delta=round(delta, 2),
        delta_pct=(round((delta / previous_total) * 100, 1) if previous_total else None),
        contributors=contributors,
    )
