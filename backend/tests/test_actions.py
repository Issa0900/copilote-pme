"""Centre d'actions + mesure avant/après (spec §31/§32/§64.16/§64.17)."""

import uuid
from datetime import date, timedelta

from app.actions import (
    MEASUREMENT_WINDOW_DAYS,
    create_action_from_recommendation,
    measure_action_outcome,
)
from app.models import Action, Recommendation


def _make_recommendation(db_session, company_id, **overrides):
    rec = Recommendation(
        company_id=company_id,
        source_type="anomaly",
        source_key=f"action-test-{uuid.uuid4().hex[:8]}",
        type=overrides.pop("type", "category_trend"),
        category=overrides.pop("category", "Fournitures"),
        situation="s",
        analysis="a",
        impact=overrides.pop("impact", "i"),
        action=overrides.pop("action", "Vérifier la catégorie « Fournitures »."),
        priority=overrides.pop("priority", "élevée"),
        status="nouvelle",
        **overrides,
    )
    db_session.add(rec)
    db_session.flush()
    return rec


# --- Capture de la baseline à la création -----------------------------------


def test_create_action_captures_category_baseline(db_session, make_company, make_import, make_transaction):
    company = make_company()
    imp = make_import(company.id)
    rec = _make_recommendation(db_session, company.id, category="Fournitures")

    today = date.today()
    # Dans la fenêtre de 30 jours : -400 $ (revenu +100, dépense -500, signé).
    make_transaction(
        company.id, imp.id, amount=100, category="Fournitures", date=today - timedelta(days=5)
    )
    make_transaction(
        company.id, imp.id, amount=-500, category="Fournitures", date=today - timedelta(days=3)
    )
    # Hors fenêtre (31 jours avant aujourd'hui) : ne doit pas compter.
    make_transaction(
        company.id, imp.id, amount=-9999, category="Fournitures", date=today - timedelta(days=31)
    )
    # Autre catégorie : ne doit pas compter.
    make_transaction(
        company.id, imp.id, amount=-1000, category="Marketing", date=today - timedelta(days=2)
    )

    action = create_action_from_recommendation(company.id, rec.id, db_session)

    assert action.metric_category == "Fournitures"
    assert float(action.baseline_value) == -400.0
    assert action.baseline_start == today - timedelta(days=MEASUREMENT_WINDOW_DAYS)
    assert action.baseline_end == today


def test_create_action_falls_back_to_net_margin_pct_when_no_category(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    rec = _make_recommendation(db_session, company.id, category=None, type="margin_decline")

    today = date.today()
    # Marge nette = (1000 - 700) / 1000 * 100 = 30.0 %.
    make_transaction(
        company.id, imp.id, amount=1000, category="Ventes", date=today - timedelta(days=5)
    )
    make_transaction(
        company.id, imp.id, amount=-700, category="Fournitures", date=today - timedelta(days=3)
    )

    action = create_action_from_recommendation(company.id, rec.id, db_session)

    assert action.metric_category is None
    assert float(action.baseline_value) == 30.0


def test_create_action_sets_recommendation_status_to_acceptee(
    db_session, make_company
):
    company = make_company()
    rec = _make_recommendation(db_session, company.id)
    assert rec.status == "nouvelle"

    create_action_from_recommendation(company.id, rec.id, db_session)

    db_session.refresh(rec)
    assert rec.status == "acceptee"


def test_create_action_default_title_is_recommendation_action(db_session, make_company):
    company = make_company()
    rec = _make_recommendation(db_session, company.id, action="Faire le point sur ce fournisseur.")

    action = create_action_from_recommendation(company.id, rec.id, db_session)

    assert action.title == "Faire le point sur ce fournisseur."


def test_create_action_copies_estimated_impact_from_recommendation(db_session, make_company):
    company = make_company()
    rec = _make_recommendation(
        db_session,
        company.id,
        impact="Une hausse non expliquée peut affecter votre rentabilité.",
    )

    action = create_action_from_recommendation(company.id, rec.id, db_session)

    assert action.estimated_impact == "Une hausse non expliquée peut affecter votre rentabilité."


def test_create_action_custom_title_overrides_default(db_session, make_company):
    company = make_company()
    rec = _make_recommendation(db_session, company.id)

    action = create_action_from_recommendation(
        company.id, rec.id, db_session, title="Négocier le contrat fournisseur"
    )

    assert action.title == "Négocier le contrat fournisseur"


# --- Mesure avant/après ------------------------------------------------------


def test_measure_action_outcome_noop_before_window_elapsed(
    db_session, make_company
):
    company = make_company()
    rec = _make_recommendation(db_session, company.id)
    action = create_action_from_recommendation(company.id, rec.id, db_session)

    measured = measure_action_outcome(action, db_session)

    assert measured.outcome_value is None
    assert measured.outcome_measured_at is None


def test_measure_action_outcome_computes_once_window_elapsed(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    rec = _make_recommendation(db_session, company.id, category="Fournitures")

    # Baseline "à la création" simulée dans le passé (on ne peut pas attendre
    # 30 jours réels dans un test) : baseline_end = il y a 31 jours, donc la
    # fenêtre de suivi (baseline_end -> +30 jours) est déjà écoulée.
    today = date.today()
    action = Action(
        company_id=company.id,
        recommendation_id=rec.id,
        title="t",
        priority="élevée",
        estimated_impact="i",
        metric_category="Fournitures",
        baseline_start=today - timedelta(days=61),
        baseline_end=today - timedelta(days=31),
        baseline_value=-400,
    )
    db_session.add(action)
    db_session.flush()

    outcome_start = action.baseline_end
    outcome_end = outcome_start + timedelta(days=MEASUREMENT_WINDOW_DAYS)
    make_transaction(
        company.id,
        imp.id,
        amount=-150,
        category="Fournitures",
        date=outcome_start + timedelta(days=5),
    )
    make_transaction(
        company.id,
        imp.id,
        amount=-100,
        category="Fournitures",
        date=outcome_end - timedelta(days=1),
    )

    measured = measure_action_outcome(action, db_session)

    assert measured.outcome_value == -250.0
    assert measured.outcome_start == outcome_start
    assert measured.outcome_end == outcome_end
    assert measured.outcome_measured_at is not None


def test_measure_action_outcome_is_frozen_once_measured(
    db_session, make_company, make_import, make_transaction
):
    company = make_company()
    imp = make_import(company.id)
    rec = _make_recommendation(db_session, company.id, category="Fournitures")

    today = date.today()
    action = Action(
        company_id=company.id,
        recommendation_id=rec.id,
        title="t",
        priority="élevée",
        estimated_impact="i",
        metric_category="Fournitures",
        baseline_start=today - timedelta(days=61),
        baseline_end=today - timedelta(days=31),
        baseline_value=-400,
    )
    db_session.add(action)
    db_session.flush()

    outcome_start = action.baseline_end
    make_transaction(
        company.id, imp.id, amount=-100, category="Fournitures", date=outcome_start + timedelta(days=1)
    )
    first = measure_action_outcome(action, db_session)
    assert first.outcome_value == -100.0

    # De nouvelles transactions arrivent dans la fenêtre déjà mesurée : la
    # mesure ne doit JAMAIS changer une fois figée (même principe que les
    # rapports).
    make_transaction(
        company.id, imp.id, amount=-9999, category="Fournitures", date=outcome_start + timedelta(days=2)
    )
    second = measure_action_outcome(action, db_session)
    assert second.outcome_value == -100.0


# --- API HTTP -----------------------------------------------------------------


def test_post_actions_creates_and_returns_result_pct_none_until_measured(
    authed_client, db_session
):
    client, _user, company = authed_client
    rec = _make_recommendation(db_session, company.id)

    resp = client.post(
        f"/companies/{company.id}/actions", json={"recommendation_id": str(rec.id)}
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "a_faire"
    assert body["metric_category"] == "Fournitures"
    assert body["result_pct"] is None

    rec_resp = client.get(f"/companies/{company.id}/recommendations")
    updated = next(r for r in rec_resp.json() if r["id"] == str(rec.id))
    assert updated["status"] == "acceptee"


def test_post_actions_unknown_recommendation_returns_404(authed_client):
    client, _user, company = authed_client
    resp = client.post(
        f"/companies/{company.id}/actions",
        json={"recommendation_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404


def test_patch_action_updates_status(authed_client, db_session):
    client, _user, company = authed_client
    rec = _make_recommendation(db_session, company.id)
    created = client.post(
        f"/companies/{company.id}/actions", json={"recommendation_id": str(rec.id)}
    ).json()

    resp = client.patch(
        f"/companies/{company.id}/actions/{created['id']}", json={"status": "en_cours"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "en_cours"


def test_patch_action_rejects_invalid_status(authed_client, db_session):
    client, _user, company = authed_client
    rec = _make_recommendation(db_session, company.id)
    created = client.post(
        f"/companies/{company.id}/actions", json={"recommendation_id": str(rec.id)}
    ).json()

    resp = client.patch(
        f"/companies/{company.id}/actions/{created['id']}", json={"status": "n_importe_quoi"}
    )
    assert resp.status_code == 422


def test_get_actions_paginated(authed_client, db_session):
    client, _user, company = authed_client
    for _ in range(3):
        rec = _make_recommendation(db_session, company.id)
        client.post(f"/companies/{company.id}/actions", json={"recommendation_id": str(rec.id)})

    resp = client.get(f"/companies/{company.id}/actions?limit=2")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    assert resp.headers["X-Total-Count"] == "3"


def test_actions_are_isolated_per_company(authed_client, db_session, make_company, make_user):
    client, _user, company = authed_client
    rec = _make_recommendation(db_session, company.id)
    client.post(f"/companies/{company.id}/actions", json={"recommendation_id": str(rec.id)})

    other_company = make_company()
    other_rec = _make_recommendation(db_session, other_company.id)
    create_action_from_recommendation(other_company.id, other_rec.id, db_session)

    resp = client.get(f"/companies/{company.id}/actions")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
