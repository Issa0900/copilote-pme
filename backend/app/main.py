from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import alerts, anomalies, companies, dashboard, imports, meta, recommendations, reports

app = FastAPI(title="Pilote PME API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(alerts.router)
app.include_router(anomalies.router)
app.include_router(companies.router)
app.include_router(dashboard.router)
app.include_router(imports.router)
app.include_router(meta.router)
app.include_router(recommendations.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}
