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

## Where the work stands (updated 2026-09-02)

Backend suite: **192 passed, 1 skipped**. Frontend typechecks clean; `npm run lint` has **pre-existing** failures in `company-nav.tsx`, `category-breakdown.tsx` and `recommandations/actions.ts` that predate this work.

Lots 1 and 2 below are committed and pushed on `fix/audit-mvp-lot-1` (PR #4, not yet merged). Lot 3 is
uncommitted at time of writing.

### Known defects, found by auditing the calculation logic against real demo data

The four findings below were the first lot of targeted fixes (2026-09-02). Three are closed; the fourth is
mitigated but structurally open.

1. ~~**The category donut adds revenue to expenses.**~~ **Fixed.** `compute_category_breakdown` now filters
   `amount < 0` and returns expenses only, in absolute value — matching the `<title>` the component already
   claimed ("Répartition des dépenses par catégorie"). Signature and `CategoryBreakdownItem` unchanged.
2. ~~**Three competing definitions of "écart" render side by side.**~~ **Fixed.** `detect_anomalies` now takes
   keyword-only `period_start`/`period_end`. When they are supplied, both detectors honour the selected period
   using the *same* previous-period formula as `variance.py` / `dashboard.py::get_company_kpis_variance`
   (span, `previous_end = period_start - 1 day`, `previous_start = previous_end - span`). Two caveats worth
   knowing before touching this code:
   - The outlier-cluster baseline deliberately stays **all history before `period_start`**, not the equal-length
     previous period — an equal-length window rarely reaches `MIN_BASELINE_SAMPLE` and would wreck the
     median/MAD robustness. So its "recent" window is calendar-exact while its baseline is not; that asymmetry
     is intentional and commented in place.
   - With `None`/`None` (no period selected) the historical behaviour is kept, but the trend wording no longer
     claims "la période précédente" — it now says explicitly that it splits the loaded history in half at the
     median date. `recommendations.py`, `reports.py` and `routers/alerts.py` still call the no-period mode;
     wiring them to a period was deliberately left out of this lot.
   `GET /companies/{id}/anomalies` accepts `start_date`/`end_date` (same convention as the other dashboard
   routes) and the dashboard now passes the active period to it. `health.py` drops the **lower** date bound on
   its `anomaly_source` query (the detector needs prior history for its baseline) while keeping the upper one,
   and passes the period through — so "Stabilité" is still scoped to the same window as the other dimensions.
3. ~~**Quarantined rows without a date vanish under any period filter.**~~ **Fixed.** `compute_company_kpis` no
   longer applies the date bounds in the outer `WHERE`; each `CASE` carries its own period condition, and the
   quarantine `CASE` reads `status == "quarantined" AND (in_period OR date IS NULL)`. Undated quarantine rows
   are therefore always counted; dated ones still honour the filter. Still **one** query.
4. **Panier moyen blends incomparable sales — mitigated, not fixed.** The formula is unchanged
   (`revenue / count(amount > 0)`): spec §14 wants `CA / nombre de commandes` and the model has no order
   entity, and there is no category/type signal in `ingestion.py` to identify refunds, deposits or subsidies
   (`CATEGORY_SYNONYMS` maps column *names*, not values), so any exclusion rule would have been guesswork.
   Instead the limit is now stated: a long comment on the computation in `kpis.py`, and on the dashboard the
   KPI card carries `TrustBadge level="hypothese"` plus a note saying every positive line counts as a sale.
   Closing this properly requires an order entity in ingestion + model — a separate lot.

Note that `health.py`'s "Qualité des données" dimension inherits the fix from item 3 for free, since it reads
`kpis.quarantined_count`.

Also landed in the same lot: two indexes on `transactions` — `ix_transactions_company_status_date` on
`(company_id, status, date)` (the dominant filter triple across `kpis.py`, `variance.py`, the anomaly and alert
routers) and `ix_transactions_import_id` (the `routers/imports.py` pattern) — migration `214c9d63a123`,
applied and verified reversible. They also blunt the cost of `health.py` now loading history without a lower
bound.

**Known perf debt from item 3's fix**: because the date bounds moved out of the outer `WHERE` and into each
`CASE`, `compute_company_kpis` now scans **every** row of the company even on a 7-day view. The composite
index still serves the `company_id, status` prefix but can no longer bound the date range. This was the price
of counting undated quarantine rows within the single-query rule; the alternative was a second dedicated
query. Harmless at MVP scale (a few thousand rows per tenant) — but this is the first place to revisit if a
tenant reaches hundreds of thousands of transactions.

### Lot 2: audit logging, pagination, company currency (spec §64)

Closed several MVP-blocking or explicitly-named gaps in spec §64 that lot 1 didn't touch:

- **Audit logging** (`app/audit.py`, spec §64.25, blocking criterion): auth, import create/delete, company
  update, and recommendation status changes are logged (logfmt, ASCII-only) — no secrets, no transaction
  content.
- **Pagination** (spec §64.24): imports, import transactions, reports, alerts, recommendations are paginated
  with `X-Total-Count` (`lib/pagination.ts`, `components/list-pagination.tsx`); every list screen now
  distinguishes a failed fetch from a genuinely empty list.
- **Company currency** (spec §64.3/§64.6/§64.8/§64.9): `Company.currency` (ISO 4217, migration
  `3a95a53031ff`), validated against a closed list (`CURRENCY_CHOICES` in `app/constants.py` — CAD/USD/EUR;
  multi-currency *conversion* stays out of MVP scope per `docs/project-charter.md`), exposed via
  `/meta/company-options`, settable at creation and in Paramètres, and threaded through every screen that
  formats a money amount (`formatCurrency(value, currency)` in `lib/format.ts` now takes the company's
  currency — it no longer defaults silently to CAD anywhere reachable from a page).
- `CompanyKpis.net_margin_pct` added as the single source of truth for net margin — `health.py` and the
  dashboard no longer recompute `net_result / revenue_total` themselves (division-by-zero-prone duplicated
  logic, now gone).
- Import transparency (spec §64.5/§64.19): `unrecognized_columns` and `duplicates_skipped` are returned on
  `POST /imports` instead of being discarded silently (not persisted — see `ImportCreateRead` docstring for
  why).

### Lot 3: missing "Marge" anomaly rule, frontend health-status gap

Found by reading the spec beyond §64 (sections 1–63 describe the fuller product vision; most of it is
aspirational/Phase 2-3, but a few sections state literal, checkable business rules worth diffing against the
code) rather than just checking the §64 acceptance boxes.

1. **§7/§12/§18/§64.12 — the "Marge" deterministic rule didn't exist.** §64.12 requires a minimum of 3
   deterministic anomaly rules (Marge, Dépenses, Ventes); only 2 rule *types* existed
   (`transaction_outlier`, `category_trend`), and neither is margin-aware — `grep -n "margin\|marge"
   app/anomalies.py app/alerts.py` returned nothing before this lot. Added `_detect_margin_decline` in
   `app/anomalies.py`, implementing §18's literal example (`if margin < target_margin and margin_change <=
   -3: create_alert(...)`) against the recent/earlier split `_detect_category_trends` already uses (period
   vs. contiguous previous period, or a median-date split of loaded history when no period is selected).
   `detect_anomalies()` gained a keyword-only `target_margin_pct` parameter (default
   `DEFAULT_TARGET_MARGIN_PCT = 20.0`, duplicated from `health.DEFAULT_TARGET_MARGIN` rather than imported —
   `health.py` already imports `detect_anomalies`, so the reverse import would cycle); every one of the 5
   call sites (`health.py`, `routers/anomalies.py`, `routers/alerts.py`, `recommendations.py`, `reports.py`)
   now resolves `company.target_margin_pct` and passes it through. `alerts.py`'s anomaly-type-to-title dict
   and `recommendations.py`'s `ANALYSIS_TEXT`/`_impact_and_action` (both keyed by `anomaly.type` with **no
   fallback** — a new type reaching them unhandled would either mislabel as a category alert or `KeyError`)
   were updated for `"margin_decline"` too. Verified against the demo tenant: fires correctly over the
   default 30-day dashboard window (margin 10.8% vs. an 18% target, down from 41.1%) and correctly abstains
   over windows where the margin clears the target (18.4% vs. 18%) or where a wider window dilutes the
   drift below the 3-point threshold — the "AND", not just "OR", condition in the spec's rule is load-bearing
   and is unit-tested (`tests/test_anomalies.py`).
   Still inherits lot 2's known "no-period mode" gap: `recommendations.py`, `reports.py`, `routers/alerts.py`
   call `detect_anomalies` without a period, so this rule (like the other two) uses the coarse median-history
   split there, not a real previous-period comparison — same deliberately-deferred limitation as lot 2 item 2.
2. **Frontend `HealthStatus` type was missing `"excellent"`.** Backend `health.py` returns 6 statuses
   (`_STATUS_ORDER`, matching spec §7's 90/75/60/40/20 thresholds exactly); `frontend/src/lib/types.ts` only
   declared 5. `health-panel.tsx`'s `STATUS_TONE`/`STATUS_LABELS` `Record<HealthStatus, Tone/string>` lookups
   therefore returned `undefined` for the best-scoring companies (score ≥ ~91 with the default 80 healthy
   threshold) — the situation badge rendered as an empty pill with the fallback "neutral" tone instead of
   "Excellente" / success-green. Fixed by adding `"excellent"` to the type and both `Record`s.

**Operational note hit while verifying lot 3 in-browser**: killing a `uvicorn --reload` parent process by PID
left an orphaned worker (spawned via `multiprocessing`) still bound to port 8000 and serving pre-edit code —
exactly the failure mode this file already warned about. `netstat`/`tasklist` under Git Bash reported a PID
that no longer existed; `Get-CimInstance Win32_Process -Filter "Name like '%python%'"` in PowerShell was what
actually found the live orphan (its `CommandLine` names the `parent_pid`). Worth reaching for that command
directly next time instead of re-diagnosing from Bash-side `netstat`/`tasklist` output, which was misleading
here.

### Deliberate deviations from the older docs

- `skill/SKILL.md` forbids circular gauges for scores; spec §7/§39 asks for a radial score. The spec is newer — follow it, and treat that skill file's palette as stale too.
- Anomaly `why` text stays methodological. Spec §2's example ("3 fournisseurs représentent 72 % de la hausse") is not reproducible: transactions carry no supplier or product link. Adding real causal analysis means extending ingestion first.

## Engineering subagents

This repo has a project-specific orchestration setup: `.claude/agents/orchestrateur-ingenierie.md` dispatches implementation/review/test work to specialized subagents (`ing-backend`, `ing-frontend`, `ing-donnees`, `ing-devops`, `ing-qa`, `ing-securite`) based on which layer a request touches. For any non-trivial cross-cutting technical request, prefer routing through the orchestrator rather than editing multiple layers ad hoc. Product/screen visual design direction is a separate concern — don't invent new visual direction in an engineering task; take it from `docs/spec-dashboard-gescop.md` first, then `skill/SKILL.md` for anything the spec leaves open.

## Operational notes

- `uvicorn --reload` does **not** reliably pick up new modules here, and killing the reloader parent can leave an orphaned child still bound to port 8000 answering with stale code. After adding a file or changing a schema, check `netstat -ano | grep ":8000"` for more than one listener and restart cleanly.
- Console output is cp1252: avoid non-Latin-1 characters (`→`, `≠`) in `print()` inside scripts, or they crash at the very end of an otherwise successful run.
