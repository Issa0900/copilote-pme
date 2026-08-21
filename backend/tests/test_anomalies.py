import uuid
from datetime import date

from app.anomalies import detect_anomalies
from app.models import Transaction


def _txn(amount, category="Ventes", d=date(2024, 6, 1)):
    return Transaction(
        id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        import_id=uuid.uuid4(),
        date=d,
        amount=amount,
        category=category,
        status="validated",
        raw_data={},
    )


def test_no_anomaly_below_minimum_sample_size():
    # Moins de MIN_TRANSACTIONS_FOR_OUTLIER_STATS (5) : aucune stat calculée.
    txns = [_txn(100), _txn(105), _txn(95)]
    assert detect_anomalies(txns) == []


def test_no_anomaly_when_all_amounts_identical():
    # stdev == 0 doit être géré sans ZeroDivisionError.
    txns = [_txn(100) for _ in range(6)]
    assert detect_anomalies(txns) == []


def test_outlier_detected_and_classified_high():
    # 20 transactions de référence : assez pour qu'un outlier extrême dépasse
    # le seuil "high" malgré son propre effet sur l'écart-type (voir le test
    # de régression ci-dessous pour le cas d'échantillon minimal).
    normal = [_txn(100) for _ in range(20)]
    outlier = _txn(10_000)
    anomalies = detect_anomalies(normal + [outlier])
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].severity == "high"
    assert outlier_anomalies[0].transaction_id == str(outlier.id)


def test_outlier_severity_capped_at_minimum_sample_size():
    # Limitation connue (identifiée en revue) : le z-score inclut le point
    # aberrant dans le calcul de sa propre moyenne/écart-type. Avec le
    # minimum de transactions requis (6 = MIN_TRANSACTIONS_FOR_OUTLIER_STATS),
    # un seul outlier — même arbitrairement extrême — plafonne mathématiquement
    # à z ≈ sqrt(n-1) ≈ 2.45, donc ne peut JAMAIS être classé "medium"/"high",
    # quelle que soit son ampleur. Ce test documente ce comportement actuel
    # (pas un correctif — un changement de cette logique est hors scope tant
    # qu'il n'a pas été validé contre les données de démo déjà vérifiées).
    normal = [_txn(100) for _ in range(6)]
    extreme_outlier = _txn(1_000_000)
    anomalies = detect_anomalies(normal + [extreme_outlier])
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].severity == "low"


def test_revenue_and_expense_populations_are_independent():
    # Une dépense inhabituelle ne doit pas être noyée dans la population des revenus.
    revenues = [_txn(100) for _ in range(6)]
    expenses = [_txn(-50) for _ in range(6)] + [_txn(-5000)]
    anomalies = detect_anomalies(revenues + expenses)
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].message.startswith("Une transaction dépense")


def test_category_trend_requires_minimum_per_period():
    # Moins de MIN_PER_PERIOD_FOR_TREND (2) par période : pas de tendance.
    txns = [
        _txn(100, category="Fournitures", d=date(2024, 1, 1)),
        _txn(200, category="Fournitures", d=date(2024, 6, 1)),
    ]
    assert [a for a in detect_anomalies(txns) if a.type == "category_trend"] == []


def test_category_trend_detected_above_threshold():
    earlier = [
        _txn(100, category="Fournitures", d=date(2024, 1, 1)),
        _txn(100, category="Fournitures", d=date(2024, 1, 2)),
    ]
    recent = [
        _txn(300, category="Fournitures", d=date(2024, 6, 1)),
        _txn(300, category="Fournitures", d=date(2024, 6, 2)),
    ]
    anomalies = [a for a in detect_anomalies(earlier + recent) if a.type == "category_trend"]
    assert len(anomalies) == 1
    assert anomalies[0].metadata["change_pct"] == 200.0


def test_category_trend_ignored_when_earlier_total_zero():
    # earlier_total == 0 doit être ignoré proprement (pas de division par zéro).
    earlier = [
        _txn(0, category="Fournitures", d=date(2024, 1, 1)),
        _txn(0, category="Fournitures", d=date(2024, 1, 2)),
    ]
    recent = [
        _txn(100, category="Fournitures", d=date(2024, 6, 1)),
        _txn(100, category="Fournitures", d=date(2024, 6, 2)),
    ]
    assert [a for a in detect_anomalies(earlier + recent) if a.type == "category_trend"] == []


def test_anomalies_sorted_by_severity():
    normal = [_txn(100) for _ in range(6)]
    mild_outlier = _txn(260)  # z autour de 2.5-3 selon stdev, severity medium/high
    anomalies = detect_anomalies(normal + [mild_outlier])
    severities = [a.severity for a in anomalies]
    assert severities == sorted(severities, key={"high": 0, "medium": 1, "low": 2}.get)
