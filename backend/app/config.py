from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Pas de valeur par défaut : une configuration manquante doit échouer
    # explicitement au démarrage plutôt que de pointer silencieusement vers
    # un identifiant fonctionnel non voulu en déploiement.
    database_url: str
    environment: str = "development"

    # JWT (auth stateless) : pas de valeur par défaut pour le secret, même
    # logique que database_url — un secret manquant doit échouer explicitement
    # au démarrage plutôt que de tomber silencieusement sur une valeur connue.
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h

    # Liste d'origines autorisées séparées par des virgules (ex. domaine
    # Vercel en production) — défaut au dev local pour ne rien casser.
    cors_allowed_origins: str = "http://localhost:3000"

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
