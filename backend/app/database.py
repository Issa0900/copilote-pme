from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# Starlette exécute les routes synchrones (tout ce module) dans un pool
# d'un maximum de 40 threads (anyio.CapacityLimiter par défaut). Sans
# configuration explicite, SQLAlchemy plafonne à 5 connexions de pool + 10
# de débordement (15 au total) avec un pool_timeout de 30s : au-delà de ~15
# requêtes DB concurrentes, les threads suivants attendent jusqu'à 30s une
# connexion libre avant d'échouer. pool_size + max_overflow = 40 pour
# couvrir le plafond réel de threads ; pool_timeout réduit à 10s pour qu'une
# vraie saturation échoue vite (le client peut réessayer) plutôt que de
# bloquer 30s. pool_pre_ping évite de réutiliser une connexion morte
# (coupure réseau, redémarrage Postgres) silencieusement.
engine = create_engine(
    settings.database_url,
    pool_size=20,
    max_overflow=20,
    pool_timeout=10,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
