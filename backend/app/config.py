from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Pas de valeur par défaut : une configuration manquante doit échouer
    # explicitement au démarrage plutôt que de pointer silencieusement vers
    # un identifiant fonctionnel non voulu en déploiement.
    database_url: str
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
