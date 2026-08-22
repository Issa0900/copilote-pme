# Déployer une démo (gratuit) — Vercel + Render

Ce guide déploie une version publique et testable de Copilote PME :
- **Frontend** (Next.js) sur **Vercel**
- **Backend** (FastAPI) + **PostgreSQL** sur **Render**

Les deux offres gratuites suffisent pour une démo portfolio. Ces étapes se font sur les sites de Vercel/Render — connexion et autorisations sont à faire par toi (Claude ne peut pas créer de compte ni valider un OAuth à ta place).

## 1. Backend + base de données sur Render

1. Va sur [render.com](https://render.com) et connecte-toi avec ton compte GitHub.
2. **New +** → **Blueprint** → sélectionne le repo `Issa0900/copilote-pme`. Render détecte le fichier `render.yaml` à la racine (créé pour toi) et propose de créer :
   - un **Web Service** `copilote-pme-backend` (Docker, dossier `backend/`)
   - une base **PostgreSQL** `copilote-pme-db`
3. Avant de cliquer sur *Apply*, dans les variables d'environnement du service backend, complète :
   - `JWT_SECRET_KEY` → génère une valeur avec :
     ```bash
     python -c "import secrets; print(secrets.token_urlsafe(64))"
     ```
   - `CORS_ALLOWED_ORIGINS` → laisse `http://localhost:3000` pour l'instant, tu la mettras à jour à l'étape 3 avec l'URL Vercel.
   - `DATABASE_URL` est déjà relié automatiquement à la base créée par le Blueprint.
4. Déploie. Le premier build installe `tesseract-ocr` (OCR) et prend quelques minutes.
5. Une fois en ligne, note l'URL du service, ex. `https://copilote-pme-backend.onrender.com`.
6. Vérifie que ça répond : `https://copilote-pme-backend.onrender.com/health` doit renvoyer `{"status":"ok"}`.

> ⚠️ Sur le plan gratuit, le service se met en veille après une période d'inactivité — la première requête après une pause peut prendre 30–50 secondes.

## 2. Frontend sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec ton compte GitHub.
2. **Add New** → **Project** → importe `Issa0900/copilote-pme`.
3. **Root Directory** → sélectionne `frontend`.
4. **Environment Variables** → ajoute :
   - `NEXT_PUBLIC_API_URL` = l'URL Render obtenue à l'étape 1 (ex. `https://copilote-pme-backend.onrender.com`)
5. Déploie. Vercel donne une URL du type `https://copilote-pme.vercel.app`.

## 3. Reboucler le CORS

Retourne dans Render → service backend → Environment → mets à jour :

```
CORS_ALLOWED_ORIGINS=https://copilote-pme.vercel.app
```

Sauvegarde → Render redéploie automatiquement le service. Sans cette étape, le frontend ne pourra pas appeler l'API (erreurs CORS dans la console navigateur).

## 4. Vérification finale

- Ouvrir l'URL Vercel, créer un compte de démo, importer un fichier de test (ex. `donnees_commerciales_test_scenario2.csv` à la racine du repo) et vérifier que le dashboard se peuple.
- Si erreur CORS dans la console : vérifier que `CORS_ALLOWED_ORIGINS` correspond exactement à l'URL Vercel (sans slash final).
- Si erreur 500 au démarrage : vérifier les logs Render (`alembic upgrade head` doit passer avant que uvicorn démarre).

## Limites du plan gratuit à connaître

| Service | Limite |
|---|---|
| Render (web service) | Mise en veille après inactivité, redémarrage lent |
| Render (PostgreSQL gratuit) | Expire après 30 jours — prévoir de recréer la base ou passer à un plan payant si la démo doit durer |
| Vercel (Hobby) | Usage personnel/non-commercial uniquement, largement suffisant pour un portfolio |
