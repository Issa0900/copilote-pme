# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Copilote PME — système de pilotage, d'anticipation et d'aide à la décision pour PME. Full spec in `PRD-Systeme-Pilotage-PME-v1.1 (1).md` and `docs/project-charter.md`.

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

Business logic lives in flat modules, not buried in routers — routers stay thin (auth/lookup/HTTP glue) and call into: `kpis.py` (KPI aggregation from validated transactions, with optional date-range filtering shared by all three KPI queries), `anomalies.py` (per-category anomaly windowing), `alerts.py`, `recommendations.py` (grouped by category, keyed by `source_key` for idempotent regeneration — see `uq_recommendation_source`), `reports.py` (daily reports persist immediately; weekly reports recompute on every call until the period closes, then persist once — see `test_reports.py` for the exact boundary behavior).

### Database

SQLAlchemy 2.0 models in `backend/app/models.py`, migrations in `backend/alembic/versions/`. Notable constraints: `Report` is unique per `(company_id, type, period)`, `Recommendation` is unique per `(company_id, source_key)` — both are used as upsert/dedup keys by their respective modules, not just integrity backstops.

### Deployment

`render.yaml` deploys backend (Docker) + managed Postgres to Render; frontend is deployed separately (see `docs/deploiement.md`). In production, FastAPI's `/docs`, `/redoc`, and `/openapi.json` are disabled (`ENVIRONMENT=production`, see `main.py`) — don't re-enable them unconditionally when touching `main.py`.

## Engineering subagents

This repo has a project-specific orchestration setup: `.claude/agents/orchestrateur-ingenierie.md` dispatches implementation/review/test work to specialized subagents (`ing-backend`, `ing-frontend`, `ing-donnees`, `ing-devops`, `ing-qa`, `ing-securite`) based on which layer a request touches. For any non-trivial cross-cutting technical request, prefer routing through the orchestrator rather than editing multiple layers ad hoc. Product/screen visual design direction is a separate concern owned by `skill/SKILL.md` — don't invent new visual direction in an engineering task.
