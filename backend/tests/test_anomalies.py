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


def test_category_trend_uses_selected_period_not_median_split():
    # Historique large, mais seule une fenêtre calendaire précise (période +
    # période précédente de même durée) doit alimenter la comparaison quand
    # elle est fournie — pas la médiane de tout l'historique.
    noise_old = [
        _txn(100, category="Fournitures", d=date(2024, 1, 1)),
        _txn(100, category="Fournitures", d=date(2024, 1, 2)),
    ]
    # span de la période sélectionnée = 1 jour (6/1 -> 6/2), donc la période
    # précédente de même durée = 5/30 -> 5/31 (previous_end = start - 1 jour,
    # previous_start = previous_end - span).
    earlier = [
        _txn(100, category="Fournitures", d=date(2024, 5, 30)),
        _txn(100, category="Fournitures", d=date(2024, 5, 31)),
    ]
    recent = [
        _txn(300, category="Fournitures", d=date(2024, 6, 1)),
        _txn(300, category="Fournitures", d=date(2024, 6, 2)),
    ]
    txns = noise_old + earlier + recent
    anomalies = [
        a
        for a in detect_anomalies(
            txns, period_start=date(2024, 6, 1), period_end=date(2024, 6, 2)
        )
        if a.type == "category_trend"
    ]
    assert len(anomalies) == 1
    # earlier = seulement la période précédente de même durée (1-2 mai),
    # pas noise_old (janvier) : earlier_total = 200, pas 400.
    assert anomalies[0].metadata["earlier_total"] == 200.0
    assert anomalies[0].metadata["recent_total"] == 600.0
    assert "à la période précédente" in anomalies[0].message


def test_category_trend_message_is_honest_without_period():
    earlier = [
        _txn(100, category="Fournitures", d=date(2024, 1, 1)),
        _txn(100, category="Fournitures", d=date(2024, 1, 2)),
    ]
    recent = [
        _txn(300, category="Fournitures", d=date(2024, 6, 1)),
        _txn(300, category="Fournitures", d=date(2024, 6, 2)),
    ]
    anomalies = [
        a for a in detect_anomalies(earlier + recent) if a.type == "category_trend"
    ]
    assert len(anomalies) == 1
    assert "à la période précédente" not in anomalies[0].message
    assert "historique" in anomalies[0].message
    assert "date médiane" in anomalies[0].why or "médiane" in anomalies[0].why


def test_outlier_cluster_uses_selected_period_as_recent_and_full_history_as_baseline():
    # Baseline bien antérieure à la période sélectionnée.
    baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 9)]
    # Transaction "recent" hors des 30 derniers jours ancrés sur la donnée la
    # plus récente, mais dans la période explicitement sélectionnée.
    outlier = _txn(10_000, d=date(2024, 6, 1))
    normal_recent = [_txn(100, d=date(2024, 6, 1)) for _ in range(3)]
    # Bruit très postérieur à la période sélectionnée : ne doit compter ni
    # comme baseline ni comme recent.
    future_noise = [_txn(100, d=date(2024, 12, 1)) for _ in range(5)]

    anomalies = detect_anomalies(
        baseline + normal_recent + [outlier] + future_noise,
        period_start=date(2024, 6, 1),
        period_end=date(2024, 6, 1),
    )
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].transaction_id == str(outlier.id)
    assert outlier_anomalies[0].detected_at == date(2024, 6, 1)


def test_outlier_cluster_none_period_behavior_unchanged():
    # Pas de régression : comportement historique (fenêtre 30 jours ancrée
    # sur la donnée) inchangé quand aucune période n'est fournie.
    baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 9)]
    recent_normal = [_txn(100, d=date(2024, 6, 1)) for _ in range(12)]
    outlier = _txn(10_000, d=date(2024, 6, 1))
    anomalies = detect_anomalies(baseline + recent_normal + [outlier])
    outlier_anomalies = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(outlier_anomalies) == 1
    assert outlier_anomalies[0].severity == "high"
    assert outlier_anomalies[0].transaction_id == str(outlier.id)


def test_outlier_cluster_message_describes_selected_period_not_30_days():
    # Cas count > 1 : le message groupé doit décrire la fenêtre réellement
    # analysée (la période sélectionnée), jamais « 30 derniers jours ».
    baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 9)]
    outliers = [
        _txn(10_000, d=date(2024, 6, 3)),
        _txn(10_000, d=date(2024, 6, 5)),
    ]

    anomalies = detect_anomalies(
        baseline + outliers,
        period_start=date(2024, 6, 1),
        period_end=date(2024, 6, 7),
    )
    clusters = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(clusters) == 1
    message = clusters[0].message
    assert clusters[0].metadata["count"] == 2
    assert "30 derniers jours" not in message
    assert "sur la période du 1 juin 2024 au 7 juin 2024" in message


def test_outlier_cluster_message_keeps_30_days_wording_without_period():
    # Sans période sélectionnée, la fenêtre glissante de 30 jours est bien
    # celle réellement employée : la formulation historique reste exacte.
    baseline = [_txn(100, d=date(2024, 1, i)) for i in range(1, 9)]
    outliers = [
        _txn(10_000, d=date(2024, 6, 3)),
        _txn(10_000, d=date(2024, 6, 5)),
    ]

    anomalies = detect_anomalies(baseline + outliers)
    clusters = [a for a in anomalies if a.type == "transaction_outlier"]
    assert len(clusters) == 1
    assert clusters[0].metadata["count"] == 2
    assert "ces 30 derniers jours" in clusters[0].message


def test_anomalies_sorted_by_severity():
    normal = [_txn(100) for _ in range(6)]
    mild_outlier = _txn(260)  # z autour de 2.5-3 selon stdev, severity medium/high
    anomalies = detect_anomalies(normal + [mild_outlier])
    severities = [a.severity for a in anomalies]
    assert severities == sorted(severities, key={"high": 0, "medium": 1, "low": 2}.get)
