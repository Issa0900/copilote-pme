import uuid
from datetime import date

from app.alerts import (
    LEVEL_RANK,
    QUARANTINE_RATIO_IMPORTANT,
    Alert,
    alerts_from_anomalies,
    alerts_from_imports,
    sort_alerts,
    summarize_alerts,
)
from app.anomalies import Anomaly
from app.models import Import


def _import(rows_processed, rows_quarantined, status="complete", error_message=None):
    return Import(
        id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        source_type="csv",
        file_name="test.csv",
        status=status,
        rows_processed=rows_processed,
        rows_quarantined=rows_quarantined,
        error_message=error_message,
    )


def test_alerts_from_anomalies_maps_severity_to_level():
    anomalies = [
        Anomaly(type="transaction_outlier", severity="high", message="m"),
        Anomaly(type="transaction_outlier", severity="medium", message="m"),
        Anomaly(type="category_trend", severity="low", message="m"),
    ]
    alerts = alerts_from_anomalies(anomalies)
    assert [a.level for a in alerts] == ["critique", "important", "surveillance"]


def test_alerts_from_anomalies_keeps_category():
    anomalies = [
        Anomaly(
            type="transaction_outlier", severity="high", message="m", category="Salaires"
        ),
        Anomaly(type="category_trend", severity="low", message="m", category="Ventes"),
        Anomaly(type="transaction_outlier", severity="medium", message="m", category=None),
    ]
    alerts = alerts_from_anomalies(anomalies)
    assert [a.category for a in alerts] == ["Salaires", "Ventes", None]


def test_alerts_from_imports_category_is_always_none():
    alerts = alerts_from_imports(
        [
            _import(0, 0, status="echoue", error_message="boom"),
            _import(rows_processed=10, rows_quarantined=4),
        ]
    )
    assert all(a.category is None for a in alerts)


def test_alerts_from_imports_failed_import_is_critical():
    alerts = alerts_from_imports([_import(0, 0, status="echoue", error_message="boom")])
    assert len(alerts) == 1
    assert alerts[0].level == "critique"


def test_alerts_from_imports_no_alert_when_quarantined_but_zero_processed():
    # rows_quarantined > 0 mais rows_processed == 0 : division par zéro évitée, pas d'alerte.
    alerts = alerts_from_imports([_import(0, 3)])
    assert alerts == []


def test_alerts_from_imports_quarantine_ratio_boundary():
    # Exactement au seuil (condition stricte ">") : reste "surveillance", pas "important".
    at_threshold = _import(rows_processed=10, rows_quarantined=3)  # ratio == 0.3
    above_threshold = _import(rows_processed=10, rows_quarantined=4)  # ratio == 0.4
    assert QUARANTINE_RATIO_IMPORTANT == 0.3
    assert alerts_from_imports([at_threshold])[0].level == "surveillance"
    assert alerts_from_imports([above_threshold])[0].level == "important"


def test_sort_alerts_respects_level_rank():
    alerts = [
        Alert(level="information", title="a", message="m", source="import"),
        Alert(level="critique", title="b", message="m", source="import"),
        Alert(level="surveillance", title="c", message="m", source="import"),
    ]
    sorted_alerts = sort_alerts(alerts)
    assert [a.level for a in sorted_alerts] == ["critique", "surveillance", "information"]


def test_summarize_alerts_includes_all_five_levels_even_at_zero():
    counts = summarize_alerts([])
    assert counts == {level: 0 for level in LEVEL_RANK}


def test_summarize_alerts_counts_correctly():
    alerts = [
        Alert(level="critique", title="a", message="m", source="anomaly"),
        Alert(level="critique", title="a", message="m", source="anomaly"),
        Alert(level="surveillance", title="a", message="m", source="import"),
    ]
    counts = summarize_alerts(alerts)
    assert counts["critique"] == 2
    assert counts["surveillance"] == 1
    assert counts["important"] == 0


def test_get_company_alerts_exposes_category_field(
    authed_client, make_import, make_transaction
):
    # Une alerte issue d'une anomalie de type transaction_outlier doit porter
    # la catégorie de la transaction source ; une alerte issue d'un import
    # échoué n'a pas de catégorie pertinente (category: null).
    client, _user, company = authed_client
    imp = make_import(company.id)

    for _ in range(20):
        make_transaction(company.id, imp.id, amount=-100, category="Salaires")
    outlier = make_transaction(company.id, imp.id, amount=-10_000, category="Salaires")

    make_import(company.id, status="echoue", error_message="fichier corrompu")

    resp = client.get(f"/companies/{company.id}/alerts")
    assert resp.status_code == 200
    alerts = resp.json()

    outlier_alerts = [a for a in alerts if a["source_id"] == str(outlier.id)]
    assert len(outlier_alerts) == 1
    assert outlier_alerts[0]["category"] == "Salaires"

    import_alerts = [a for a in alerts if a["source"] == "import"]
    assert import_alerts
    assert all(a["category"] is None for a in import_alerts)
