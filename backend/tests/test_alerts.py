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
from app.models import Import, Transaction


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


def test_alerts_from_anomalies_keeps_why_impact_action():
    # Quoi/Pourquoi/Impact/Action (spec §51/§64.13) doit survivre jusqu'à
    # l'Alert — c'est le trou qui faisait passer l'écran Alertes pour moins
    # explicatif que le tableau de bord (même donnée source, deux chemins).
    anomalies = [
        Anomaly(
            type="margin_decline",
            severity="high",
            message="La marge nette est de 10.8 %...",
            why="Règle déterministe...",
            impact_amount=-8799.09,
            action="Examiner les transactions en catégorie « Fournitures »...",
        )
    ]
    alerts = alerts_from_anomalies(anomalies)
    assert len(alerts) == 1
    assert alerts[0].why == "Règle déterministe..."
    assert alerts[0].impact_amount == -8799.09
    assert alerts[0].action.startswith("Examiner")


def test_alerts_from_imports_why_impact_action_are_none():
    # Une alerte d'import n'a pas ce quadruplet : `message` porte déjà tout
    # le raisonnement disponible pour cette source.
    alerts = alerts_from_imports([_import(0, 0, status="echoue", error_message="boom")])
    assert alerts[0].why is None
    assert alerts[0].impact_amount is None
    assert alerts[0].action is None


def _quarantined_txn(import_id, reasons):
    return Transaction(
        id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        import_id=import_id,
        status="quarantined",
        quarantine_reasons=reasons,
        raw_data={},
    )


def test_alerts_from_imports_reports_quarantine_reasons_breakdown():
    imp = _import(rows_processed=10, rows_quarantined=3)
    quarantined_by_import = {
        imp.id: [
            _quarantined_txn(imp.id, ["date manquante ou illisible"]),
            _quarantined_txn(imp.id, ["date manquante ou illisible"]),
            _quarantined_txn(imp.id, ["montant manquant ou illisible"]),
        ]
    }
    alerts = alerts_from_imports([imp], quarantined_by_import)
    assert len(alerts) == 1
    message = alerts[0].message
    # Motif le plus fréquent d'abord.
    assert "2 date manquante ou illisible" in message
    assert "1 montant manquant ou illisible" in message
    assert message.index("2 date") < message.index("1 montant")


def test_alerts_from_imports_without_breakdown_keeps_count_only_message():
    # Sans `quarantined_by_import` (comportement historique — un appelant qui
    # n'a chargé que les imports), le message reste au seul compte, pas de
    # `KeyError`/`AttributeError`.
    imp = _import(rows_processed=10, rows_quarantined=3)
    alerts = alerts_from_imports([imp])
    assert len(alerts) == 1
    assert "Motifs" not in alerts[0].message


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
    #
    # Le détecteur exige une baseline d'au moins MIN_BASELINE_SAMPLE (8)
    # transactions datées avant la fenêtre récente (30 jours précédant la
    # date la plus récente des données de l'entreprise) ; l'outlier doit être
    # daté dans cette fenêtre récente pour être testé contre la baseline.
    client, _user, company = authed_client
    imp = make_import(company.id)

    for i in range(1, 9):
        make_transaction(
            company.id, imp.id, amount=-100, category="Salaires", date=date(2024, 1, i)
        )
    for _ in range(12):
        make_transaction(
            company.id, imp.id, amount=-100, category="Salaires", date=date(2024, 6, 15)
        )
    outlier = make_transaction(
        company.id, imp.id, amount=-10_000, category="Salaires", date=date(2024, 6, 15)
    )

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


def test_get_company_alerts_exposes_why_impact_action_and_quarantine_reasons(
    authed_client, make_import, make_transaction
):
    client, _user, company = authed_client
    imp = make_import(company.id)

    for i in range(1, 9):
        make_transaction(
            company.id, imp.id, amount=-100, category="Salaires", date=date(2024, 1, i)
        )
    for _ in range(12):
        make_transaction(
            company.id, imp.id, amount=-100, category="Salaires", date=date(2024, 6, 15)
        )
    outlier = make_transaction(
        company.id, imp.id, amount=-10_000, category="Salaires", date=date(2024, 6, 15)
    )

    quarantined_import = make_import(company.id, rows_processed=2, rows_quarantined=2)
    make_transaction(
        company.id,
        quarantined_import.id,
        status="quarantined",
        quarantine_reasons=["date manquante ou illisible"],
    )
    make_transaction(
        company.id,
        quarantined_import.id,
        status="quarantined",
        quarantine_reasons=["date manquante ou illisible"],
    )

    resp = client.get(f"/companies/{company.id}/alerts")
    assert resp.status_code == 200
    alerts = resp.json()

    outlier_alerts = [a for a in alerts if a["source_id"] == str(outlier.id)]
    assert len(outlier_alerts) == 1
    assert outlier_alerts[0]["why"]
    assert outlier_alerts[0]["action"]

    quarantine_alerts = [
        a for a in alerts if a["source_id"] == str(quarantined_import.id)
    ]
    assert len(quarantine_alerts) == 1
    assert "2 date manquante ou illisible" in quarantine_alerts[0]["message"]
    assert quarantine_alerts[0]["why"] is None
