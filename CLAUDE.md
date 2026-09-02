# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Gescop** (renamed from "Copilote PME" on 2026-09-01 — the old name survives in `PRD-…md`, `docs/`, `skill/` and `.claude/agents/`, which have not been renamed) — système de pilotage, d'anticipation et d'aide à la décision pour PME.

Reference documents, in order of authority:
1. **`docs/spec-dashboard-gescop.md`** — the current dashboard specification (structure, charts, business rules). Most recent, and it settles several ambiguities the older documents left open.
2. `PRD-Systeme-Pilotage-PME-v1.1 (1).md` and `docs/project-charter.md` — original product framing, still authoritative on scope and the trust principles.
3. `skill/SKILL.md` — visual direction. **Partly outdated**: the palette there predates the Gescop rebrand (see `frontend/src/app/globals.css` for the live tokens), and its "never a circular gauge for a score" rule is contradicted by the dashboard spec §7/§39, which asks for a radial score. The spec wins.

- **Backend**: FastAPI (Python) — `backend/app/`
- **Frontend**: Next.js 16 / React 19 / TypeScript / Tailwind — `frontend/src/`
- **Database**: PostgreSQL via Docker — `docker-compose.yml`

## Setup & commands

Environment files (copy once, not committed):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Database (required — backend fails to start without `DATABASE_URL` and `JWT_SECRET_KEY` set):

```bash
docker compose up -d
```

Backend (from `backend/`, using the existing venv):

```bash
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

Runs on `http://localhost:8000` by default; `NEXT_PUBLIC_API_URL` on the frontend must match.

Frontend (from `frontend/`):

```bash
npm run dev
npm run build
npm run lint
```

### Backend tests

```bash
cd backend
./.venv/Scripts/python.exe -m pytest
./.venv/Scripts/python.exe -m pytest tests/test_kpis.py
./.venv/Scripts/python.exe -m pytest tests/test_kpis.py::test_some_case -v
```

Tests hit the real local Postgres from `docker-compose.yml` (no separate test DB) — the `db_session` fixture in `tests/conftest.py` wraps each test in a transaction that's rolled back afterward, so nothing persists. The Postgres container must be running (`docker compose up -d`) before running tests.

### Migrations (Alembic, from `backend/`)

```bash
./.venv/Scripts/python.exe -m alembic upgrade head
./.venv/Scripts/python.exe -m alembic revision -m "description"
```

## Architecture

### Auth & multi-tenancy

Stateless JWT bearer auth (`backend/app/auth.py`). Each `User` belongs to exactly one `Company` (MVP: no multi-org membership) — that boundary is the tenant isolation. Almost every company-scoped router is mounted under `/companies/{company_id}/...` and depends on `require_company_access`, which 403s if the token's `company_id` claim doesn't match the path's `company_id`. When adding a new company-scoped endpoint, depend on `require_company_access` (or nest under a router that already does), not just `get_current_user` — omitting it reopens cross-tenant access (this was VULN-002).

The frontend never talks to the backend with a shared API key — it forwards the user's session. `frontend/src/lib/auth.ts` stores the JWT in an httpOnly cookie; `frontend/src/lib/api.ts`'s `apiFetch()` is the one place that attaches `Authorization: Bearer <token>` and redirects to `/connexion` on missing/expired tokens (401). New server-side calls to the backend should go through `apiFetch`, not raw `fetch`.

### Ingestion pipeline (`backend/app/ingestion.py`)

Central to the product: turns messy PME exports (CSV/TSV/XLSX/XLS/ODS/JSON/XML/PDF, including scanned PDFs via OCR fallback) into `Transaction` rows. Key mechanics:
- Column mapping is done via synonym sets (`DATE_SYNONYMS`, `AMOUNT_SYNONYMS`, etc.), not fixed headers — a new import source usually means extending a synonym set rather than writing a new parser.
- `PROFILES` (`generique`, `ventes_pos`) layer additional recognized columns/defaults on top of the generic mapping — see `POS_AMOUNT_SYNONYMS`/`POS_DEFAULT_CATEGORY`. Adding a POS/ERP-specific export format is usually a new profile, not a fork of the pipeline.
- Rows that fail validation are quarantined (`Transaction.status`, `quarantine_reasons`) rather than dropped or failing the whole import — KPIs and anomaly detection deliberately only read `status == "validated"` rows.
- Uploads are size-capped and read in chunks (`routers/imports.py`) before any parsing, to avoid loading an arbitrarily large file into memory.

### Domain modules under `backend/app/`

Business logic lives in flat modules, not buried in routers — routers stay thin (auth/lookup/HTTP glue) and call into:

- **`kpis.py`** — KPI aggregation from validated transactions. `compute_company_kpis` does all six aggregates in **one** query via `CASE` expressions; don't split it back into separate queries. `compute_daily_series` returns `net`, `revenue` and `expenses` per day (the dashboard needs all three).
- **`health.py`** — the 0-100 health score and its dimensions (Rentabilité, Dépenses, Stabilité, **Trajectoire**, Qualité des données). Two rules matter and are easy to break:
  - Every dimension explains its own score in plain French. The score must never be a black box (PRD §44).
  - The global status is **not** the plain translation of the average: any dimension below `CRITICAL_DIMENSION_SCORE` downgrades the verdict one step per dimension (spec §7). This exists because a company losing 62 % of its profit scored 97/100 before Trajectoire and this rule were added.
  - A company with no data scores 0 on Stabilité and Trajectoire, not 100/50 — "nothing to analyse" is not evidence of health.
- **`variance.py`** — variance analysis: which categories drive the movement of a KPI between two periods. `share_of_change_pct` can legitimately exceed 100 % or go negative when categories offset each other; that's the useful signal ("the rise is masked by a fall elsewhere"), not a bug to normalise away.
- **`anomalies.py`** — statistical detection (median/MAD outlier clusters + per-category trend). Anomalies carry a `why` / `impact_amount` / `action` triple so the UI can render "Quoi / Pourquoi / Impact / Action" (spec §2). `why` describes the **detection method**, never a business cause — the model has no supplier/product link, so claiming one would present a hypothesis as fact.
- `alerts.py`, `recommendations.py` (grouped by category, keyed by `source_key` for idempotent regeneration — see `uq_recommendation_source`), `reports.py` (daily reports persist immediately; weekly reports recompute on every call until the period closes, then persist once — see `test_reports.py` for the exact boundary behavior).

### Demo data

`backend/scripts/seed_demo.py` builds a full demo tenant (Café Lumière, ~2 300 transactions over 6 months, weekly seasonality, quarantined rows, and a deliberate supply-cost drift in the last month so the detector has something real to find). Re-running it recreates the tenant from scratch:

```bash
cd backend && ./.venv/Scripts/python.exe -m scripts.seed_demo
```

Login: `demo@gescop.test` / `demo-gescop-2026`.

### Database

SQLAlchemy 2.0 models in `backend/app/models.py`, migrations in `backend/alembic/versions/`. Notable constraints: `Report` is unique per `(company_id, type, period)`, `Recommendation` is unique per `(company_id, source_key)` — both are used as upsert/dedup keys by their respective modules, not just integrity backstops.

### Deployment

`render.yaml` deploys backend (Docker) + managed Postgres to Render; frontend is deployed separately (see `docs/deploiement.md`). In production, FastAPI's `/docs`, `/redoc`, and `/openapi.json` are disabled (`ENVIRONMENT=production`, see `main.py`) — don't re-enable them unconditionally when touching `main.py`.

## Where the work stands (updated 2026-09-01)

Backend suite: **138 passed, 1 skipped**. Frontend typechecks clean; `npm run lint` has **pre-existing** failures in `company-nav.tsx`, `category-breakdown.tsx` and `recommandations/actions.ts` that predate this work.

### Known defects, found by auditing the calculation logic against real demo data

Verified, still open, roughly by severity:

1. **The category donut adds revenue to expenses.** `compute_category_breakdown` sums `abs(amount)` with no sign filter, so "Loyer" (an expense) and "Ventes comptoir" (revenue) are slices of the same pie and the centre total is meaningless. The component's own `<title>` claims it shows expenses only. Fix: split by sign, or scope it to expenses and say so.
2. **Three competing definitions of "écart" render side by side.** `variance.py` compares the selected period to the preceding one of equal length; the anomaly cluster detector uses a 30-day window anchored on the newest data; the anomaly trend detector splits at the **median date of all history** (with 6 months loaded, that's 3 months vs 3 months) while its wording says "la période précédente". On a 7-day view the same category shows three unrelated numbers. Fix: make every detector honour the selected period.
3. **Quarantined rows without a date vanish under any period filter.** 6 of the 11 seeded quarantine rows have `date IS NULL` — which is *why* they're quarantined — so filtering hides the worst rows and makes data quality look better the closer you look.
4. **Panier moyen blends incomparable sales.** It is `revenue / count(amount > 0)`, so counter sales (~45 $), online (~120 $) and catering (~450 $) average to a figure describing no real transaction, and any positive line (refund, deposit, subsidy) counts as a sale. Spec §14 defines it as `CA / nombre de commandes` — the model has no order entity yet.

`health.py` already carries the fixes for the two worst findings (trend blindness, critical-dimension downgrade); items 1–4 above have **not** been started.

### Deliberate deviations from the older docs

- `skill/SKILL.md` forbids circular gauges for scores; spec §7/§39 asks for a radial score. The spec is newer — follow it, and treat that skill file's palette as stale too.
- Anomaly `why` text stays methodological. Spec §2's example ("3 fournisseurs représentent 72 % de la hausse") is not reproducible: transactions carry no supplier or product link. Adding real causal analysis means extending ingestion first.

## Engineering subagents

This repo has a project-specific orchestration setup: `.claude/agents/orchestrateur-ingenierie.md` dispatches implementation/review/test work to specialized subagents (`ing-backend`, `ing-frontend`, `ing-donnees`, `ing-devops`, `ing-qa`, `ing-securite`) based on which layer a request touches. For any non-trivial cross-cutting technical request, prefer routing through the orchestrator rather than editing multiple layers ad hoc. Product/screen visual design direction is a separate concern — don't invent new visual direction in an engineering task; take it from `docs/spec-dashboard-gescop.md` first, then `skill/SKILL.md` for anything the spec leaves open.

## Operational notes

- `uvicorn --reload` does **not** reliably pick up new modules here, and killing the reloader parent can leave an orphaned child still bound to port 8000 answering with stale code. After adding a file or changing a schema, check `netstat -ano | grep ":8000"` for more than one listener and restart cleanly.
- Console output is cp1252: avoid non-Latin-1 characters (`→`, `≠`) in `print()` inside scripts, or they crash at the very end of an otherwise successful run.
