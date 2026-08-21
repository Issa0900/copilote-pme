"""Détection d'anomalies statistique (PRD Module 7, section 13).

Comparaisons implémentées : écart à la moyenne historique (transaction
inhabituelle) et écart entre période récente et période antérieure par
catégorie (tendance). Ce sont des interprétations statistiques du système
(étiquette ANALYSE, PRD section 44), pas des faits bruts.

Le Module 6 (analyse causale — "cause probable : ...") n'est pas implémenté
ici : il nécessiterait un raisonnement (coût fournisseur, mix produit,
publicité...) sur des données que le modèle actuel ne capture pas encore
(pas de rattachement fournisseur/produit par transaction).
"""

import statistics
from dataclasses import dataclass, field
from datetime import date

from app.models import Transaction

MIN_TRANSACTIONS_FOR_OUTLIER_STATS = 5
OUTLIER_Z_THRESHOLD = 2.0

MIN_PER_PERIOD_FOR_TREND = 2
TREND_CHANGE_THRESHOLD = 0.3  # 30 %


@dataclass
class Anomaly:
    type: str
    severity: str
    message: str
    category: str | None = None
    transaction_id: str | None = None
    detected_at: date | None = None
    metadata: dict = field(default_factory=dict)


def _outlier_severity(z: float) -> str:
    if z >= 3:
        return "high"
    if z >= 2.5:
        return "medium"
    return "low"


def _trend_severity(change: float) -> str:
    if change >= 0.75:
        return "high"
    if change >= 0.5:
        return "medium"
    return "low"


def _detect_transaction_outliers(transactions: list[Transaction]) -> list[Anomaly]:
    anomalies: list[Anomaly] = []

    for label, population in (
        ("revenu", [t for t in transactions if t.amount is not None and t.amount > 0]),
        ("dépense", [t for t in transactions if t.amount is not None and t.amount < 0]),
    ):
        if len(population) < MIN_TRANSACTIONS_FOR_OUTLIER_STATS:
            continue

        amounts = [abs(float(t.amount)) for t in population]
        mean = statistics.mean(amounts)
        stdev = statistics.pstdev(amounts)
        if stdev == 0:
            continue

        for t, amount in zip(population, amounts):
            z = (amount - mean) / stdev
            if z >= OUTLIER_Z_THRESHOLD:
                anomalies.append(
                    Anomaly(
                        type="transaction_outlier",
                        severity=_outlier_severity(z),
                        message=(
                            f"Une transaction {label} inhabituelle de {amount:.2f} $ a été "
                            f"détectée le {t.date.isoformat() if t.date else 'date inconnue'}"
                            + (f" ({t.category})" if t.category else "")
                            + f", contre une moyenne de {mean:.2f} $."
                        ),
                        category=t.category,
                        transaction_id=str(t.id),
                        detected_at=t.date,
                        metadata={"z_score": round(z, 2), "mean": round(mean, 2)},
                    )
                )

    return anomalies


def _detect_category_trends(transactions: list[Transaction]) -> list[Anomaly]:
    dated = [t for t in transactions if t.date is not None and t.category]
    if len(dated) < MIN_PER_PERIOD_FOR_TREND * 2:
        return []

    sorted_dates = sorted(t.date for t in dated)
    median_date = sorted_dates[len(sorted_dates) // 2]

    by_category: dict[str, dict[str, list[float]]] = {}
    for t in dated:
        bucket = "recent" if t.date >= median_date else "earlier"
        by_category.setdefault(t.category, {"earlier": [], "recent": []})
        by_category[t.category][bucket].append(abs(float(t.amount or 0)))

    anomalies: list[Anomaly] = []
    for category, periods in by_category.items():
        earlier, recent = periods["earlier"], periods["recent"]
        if len(earlier) < MIN_PER_PERIOD_FOR_TREND or len(recent) < MIN_PER_PERIOD_FOR_TREND:
            continue

        earlier_total = sum(earlier)
        recent_total = sum(recent)
        if earlier_total == 0:
            continue

        change = (recent_total - earlier_total) / earlier_total
        if abs(change) >= TREND_CHANGE_THRESHOLD:
            direction = "supérieures" if change > 0 else "inférieures"
            anomalies.append(
                Anomaly(
                    type="category_trend",
                    severity=_trend_severity(abs(change)),
                    message=(
                        f"Les montants en catégorie « {category} » sont "
                        f"{abs(change) * 100:.0f} % {direction} à la période précédente "
                        f"({earlier_total:.2f} $ → {recent_total:.2f} $)."
                    ),
                    category=category,
                    metadata={
                        "earlier_total": round(earlier_total, 2),
                        "recent_total": round(recent_total, 2),
                        "change_pct": round(change * 100, 1),
                    },
                )
            )

    return anomalies


def detect_anomalies(transactions: list[Transaction]) -> list[Anomaly]:
    anomalies = _detect_transaction_outliers(transactions) + _detect_category_trends(
        transactions
    )
    severity_rank = {"high": 0, "medium": 1, "low": 2}
    return sorted(anomalies, key=lambda a: severity_rank[a.severity])
