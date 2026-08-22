from datetime import date

from app.anomalies import Anomaly
from app.models import Recommendation
from app.recommendations import (
    _commit_new_recommendations,
    _source_key,
    build_recommendation_drafts,
)


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


def test_build_recommendation_drafts_keeps_category():
    drafts = build_recommendation_drafts([_outlier_anomaly("high"), _trend_anomaly()])
    assert {d.category for d in drafts} == {None, "Fournitures"}


def test_get_company_recommendations_exposes_category_field(
    authed_client, make_import, make_transaction
):
    # Une recommandation générée à partir d'une anomalie de catégorie connue
    # (ici "Salaires") doit porter cette catégorie dans la réponse API.
    #
    # Le détecteur d'outliers exige une baseline d'au moins MIN_BASELINE_SAMPLE
    # (8) transactions datées avant la fenêtre récente (30 jours précédant la
    # date la plus récente des données) ; l'outlier doit être daté dans cette
    # fenêtre récente pour être testé contre la baseline. L'outlier reste
    # d'amplitude modeste (-200 plutôt que -10 000) : un montant trop extrême
    # ferait aussi basculer le total récent bien au-delà du seuil du
    # détecteur de tendance (indépendant, basé sur un partage médian de
    # toutes les dates de la catégorie), ce qui ajouterait une seconde
    # recommandation "category_trend" et invaliderait l'assertion ci-dessous.
    client, _user, company = authed_client
    imp = make_import(company.id)

    for i in range(1, 21):
        make_transaction(
            company.id, imp.id, amount=-100, category="Salaires", date=date(2024, 1, i)
        )
    make_transaction(
        company.id, imp.id, amount=-200, category="Salaires", date=date(2024, 6, 15)
    )

    resp = client.get(f"/companies/{company.id}/recommendations")
    assert resp.status_code == 200
    recs = resp.json()

    salaires_recs = [r for r in recs if r["category"] == "Salaires"]
    assert salaires_recs
    assert all(r["type"] == "transaction_outlier" for r in salaires_recs)


def _make_recommendation(company_id, source_key, **overrides) -> Recommendation:
    return Recommendation(
        company_id=company_id,
        source_type=overrides.pop("source_type", "anomaly"),
        source_key=source_key,
        type=overrides.pop("type", "transaction_outlier"),
        situation=overrides.pop("situation", "s"),
        analysis=overrides.pop("analysis", "a"),
        impact=overrides.pop("impact", "i"),
        action=overrides.pop("action", "act"),
        priority=overrides.pop("priority", "urgente"),
        **overrides,
    )


def test_commit_new_recommendations_rolls_back_on_concurrent_duplicate(
    db_session, make_company
):
    # Régression : deux requêtes GET concurrentes constatent toutes les deux
    # qu'une source_key n'existe pas encore et tentent de l'insérer -> viole
    # uq_recommendation_source. On simule la ligne "concurrente" déjà
    # commitée (comme si une autre requête l'avait insérée en premier), puis
    # on tente d'insérer un doublon avec la même source_key.
    company = make_company()

    concurrent = _make_recommendation(
        company.id, "transaction_outlier::txn-1", situation="version concurrente"
    )
    db_session.add(concurrent)
    db_session.commit()  # simule une requête concurrente déjà commitée

    duplicate = _make_recommendation(
        company.id, "transaction_outlier::txn-1", situation="version en conflit"
    )
    db_session.add(duplicate)

    _commit_new_recommendations(db_session)  # ne doit pas lever d'IntegrityError

    recs = (
        db_session.query(Recommendation)
        .filter(Recommendation.company_id == company.id)
        .all()
    )
    # Seule la version déjà commitée par la requête concurrente subsiste ;
    # notre insertion en conflit a été annulée (rollback), pas persistée.
    assert len(recs) == 1
    assert recs[0].situation == "version concurrente"


def test_commit_new_recommendations_commits_when_no_conflict(db_session, make_company):
    company = make_company()
    rec = _make_recommendation(company.id, "transaction_outlier::txn-2")
    db_session.add(rec)

    _commit_new_recommendations(db_session)

    recs = (
        db_session.query(Recommendation)
        .filter(Recommendation.company_id == company.id)
        .all()
    )
    assert len(recs) == 1
