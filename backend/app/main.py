from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.rate_limit import limiter
from app.routers import alerts, anomalies, auth, companies, dashboard, imports, meta, recommendations, reports

# VULN-004 : /docs, /redoc et /openapi.json ne doivent pas être exposés en
# production — désactivés (None) dès que settings.environment == "production".
_docs_enabled = settings.environment != "production"

app = FastAPI(
    title="Pilote PME API",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

# VULN-005 : rate limiting sur les endpoints publics non authentifiés
# (/auth/login, /auth/register) — cf. app/rate_limit.py pour les seuils.
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    # slowapi renvoie par défaut {"error": "..."} — on harmonise avec le
    # reste de l'API qui renvoie systématiquement {"detail": "..."} via
    # HTTPException (cf. schemas.py / routers), pour ne pas surprendre un
    # client qui gère déjà ce format.
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de tentatives, réessayez dans quelques instants"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(alerts.router)
app.include_router(anomalies.router)
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(dashboard.router)
app.include_router(imports.router)
app.include_router(meta.router)
app.include_router(recommendations.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}
