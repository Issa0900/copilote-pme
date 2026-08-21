from app.anomalies import Anomaly
from app.recommendations import _source_key, build_recommendation_drafts


def _trend_anomaly(category="Fournitures", change_pct=50.0):
    return Anomaly(
        type="category_trend",
        severity="medium",
        message="m",
        category=category,
        metadata={"change_pct": change_pct},
    )


def _outlier_anomaly(severity="high", transaction_id="txn-1"):
    return Anomaly(
        type="transaction_outlier",
        severity=severity,
        message="m",
        transaction_id=transaction_id,
    )


def test_low_severity_anomalies_produce_no_recommendation():
    low = Anomaly(type="transaction_outlier", severity="low", message="m", transaction_id="t1")
    assert build_recommendation_drafts([low]) == []


def test_high_and_medium_severity_produce_recommendations():
    drafts = build_recommendation_drafts([_outlier_anomaly("high"), _trend_anomaly()])
    assert len(drafts) == 2
    assert {d.priority for d in drafts} == {"urgente", "élevée"}


def test_source_key_stable_for_outlier_with_same_transaction():
    a = _outlier_anomaly(transaction_id="txn-42")
    assert _source_key(a, "2024-06") == _source_key(a, "2024-07")


def test_source_key_differs_across_detection_periods_for_trend():
    # Régression : sans dimension temporelle, une même catégorie ne générait
    # plus jamais de nouvelle recommandation après le premier épisode traité.
    anomaly = _trend_anomaly(category="Fournitures")
    key_june = _source_key(anomaly, "2024-06")
    key_july = _source_key(anomaly, "2024-07")
    assert key_june != key_july


def test_source_key_same_within_same_detection_period():
    anomaly = _trend_anomaly(category="Fournitures")
    assert _source_key(anomaly, "2024-06") == _source_key(anomaly, "2024-06")


def test_build_recommendation_drafts_uses_given_detection_period():
    drafts = build_recommendation_drafts([_trend_anomaly()], detection_period="2024-06")
    assert drafts[0].source_key.endswith("2024-06")
