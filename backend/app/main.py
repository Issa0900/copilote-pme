from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
