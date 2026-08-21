# Pilote PME

Système intelligent de pilotage, d'anticipation et d'aide à la décision pour PME.
Voir `PRD-Systeme-Pilotage-PME-v1.1 (1).md` pour le cadrage produit complet.

## Stack (MVP, section 39 du PRD)

- **Frontend** : Next.js (TypeScript, Tailwind) — `frontend/`
- **Backend** : FastAPI (Python) — `backend/`
- **Base de données** : PostgreSQL (via Docker) — `docker-compose.yml`

## Environnement — statut

L'environnement est configuré et les dépendances sont installées. Rien n'est encore démarré.

- `frontend/` : projet Next.js créé, `node_modules` installés.
- `backend/` : venv Python (`backend/.venv`) créé, dépendances installées (FastAPI, SQLAlchemy, pandas, pdfplumber, etc.).
- `docker-compose.yml` : service Postgres prêt à être lancé.

## Démarrage (quand vous êtes prêt)

Copier les fichiers d'environnement d'exemple :

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Base de données :

```bash
docker compose up -d
```

Backend (depuis `backend/`) :

```bash
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

Le backend écoute par défaut sur `http://localhost:8000` (port par défaut d'uvicorn, aucun `--port` n'est passé ci-dessus). La variable `NEXT_PUBLIC_API_URL` côté frontend doit pointer vers cette même URL.

Frontend (depuis `frontend/`) :

```bash
npm run dev
```
