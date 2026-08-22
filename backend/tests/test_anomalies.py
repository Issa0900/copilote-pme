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
    # Baseline d'au moins MIN_BASELINE_SAMPLE (8) transactions datées bien
    # avant la fenêtre récente (30 jours précédant la date la plus récente
    # des données) : nécessaire pour que le détecteur calcule une médiane/MAD
    # de référence pour ce groupe (catégorie, signe). Le reste des
    # transactions « normales » et l'outlier sont datés dans la fenêtre
    # récente, seule population testée contre la baseline.
    baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 9)]
    recent_normal = [_txn(100, d=date(2024, 6, 1)) for _ in range(12)]
    outlier = _txn(10_000, d=date(2024, 6, 1))
    anomalies = detect_anomalies(baseline + recent_normal + [outlier])
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].severity == "high"
    assert outlier_anomalies[0].transaction_id == str(outlier.id)


def test_outlier_detected_with_minimum_baseline_sample():
    # Ancien comportement (modèle par écart-type, remplacé) : le point
    # aberrant était inclus dans le calcul de sa propre moyenne/écart-type,
    # ce qui plafonnait mathématiquement le z-score avec un petit échantillon
    # (z ≈ sqrt(n-1)), empêchant JAMAIS un outlier extrême d'être classé
    # "medium"/"high" avec peu de données.
    #
    # Le nouveau modèle sépare proprement baseline (référence, avant la
    # fenêtre récente) et recent (transactions testées, dans la fenêtre) :
    # le point testé n'influence jamais sa propre référence, donc ce
    # plafond n'existe plus. Ce test vérifie qu'une baseline de taille
    # exactement minimale (MIN_BASELINE_SAMPLE = 8) suffit à détecter un
    # outlier extrême sans plafonnement.
    baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 9)]  # exactement 8
    extreme_outlier = _txn(1_000_000, d=date(2024, 6, 1))
    anomalies = detect_anomalies(baseline + [extreme_outlier])
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].severity == "high"


def test_no_outlier_below_minimum_baseline_sample():
    # Avec seulement 7 transactions de référence (< MIN_BASELINE_SAMPLE = 8),
    # le groupe (catégorie, signe) est ignoré entièrement par le détecteur,
    # même en présence d'un point manifestement aberrant dans la fenêtre récente.
    baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 8)]  # 7 seulement
    extreme_outlier = _txn(1_000_000, d=date(2024, 6, 1))
    anomalies = detect_anomalies(baseline + [extreme_outlier])
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert outlier_anomalies == []


def test_revenue_and_expense_populations_are_independent():
    # Une dépense inhabituelle ne doit pas être noyée dans la population des
    # revenus. Chaque population (revenu/dépense) a sa propre baseline d'au
    # moins MIN_BASELINE_SAMPLE (8) transactions avant la fenêtre récente.
    revenue_baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 9)]
    expense_baseline = [_txn(-50, d=date(2024, 1, i)) for i in range(1, 9)]
    revenue_recent = [_txn(100, d=date(2024, 6, 1)) for _ in range(6)]
    expense_recent = [_txn(-50, d=date(2024, 6, 1)) for _ in range(6)]
    outlier = _txn(-5000, d=date(2024, 6, 1))
    anomalies = detect_anomalies(
        revenue_baseline + expense_baseline + revenue_recent + expense_recent + [outlier]
    )
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].message.startswith("Une dépense inhabituelle")


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
