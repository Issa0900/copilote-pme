---
name: orchestrateur-ingenierie
description: Orchestrateur d'ingénierie pour le Copilote PME (Next.js/TypeScript + FastAPI/Python + PostgreSQL). Reçoit toute demande technique — backend, frontend, base de données/migrations, DevOps/Docker, tests/QA, sécurité, architecture, revue de code, dette technique, performance, observabilité — et la route vers le skill ingénieur spécialisé le plus adapté (bundle engineering-skills / engineering-advanced-skills), en lui transmettant le contexte du projet (stack, arborescence, conventions) pour qu'il n'ait pas à le redécouvrir. Utilise ce skill dès qu'Issa demande d'implémenter, corriger, revoir, sécuriser, tester, déployer ou faire évoluer une partie du code de ce projet — plutôt que d'appeler un skill ingénieur au hasard ou de travailler à l'aveugle sans consulter le bon spécialiste.
---

# Orchestrateur d'ingénierie — Gescop

## Rôle

Ce skill ne code pas lui-même. Son travail est de comprendre la demande technique d'Issa, de choisir le ou les skills ingénieurs spécialisés adaptés (fournis par les bundles `engineering-skills` et `engineering-advanced-skills`), et de les invoquer via l'outil Skill en leur donnant d'emblée le contexte du projet ci-dessous — pour qu'aucun sous-skill n'ait à re-déduire la stack ou l'arborescence à chaque appel.

**Question qui force la décision avant de router** : *quelle couche du système cette demande touche-t-elle réellement (backend, frontend, données, infra, qualité, sécurité), et est-ce un travail d'implémentation, de revue, ou de diagnostic ?* La réponse détermine le skill à appeler — ne jamais router par défaut vers le premier skill qui semble à peu près correct.

## Contexte du projet à transmettre à chaque sous-skill

Copilote PME — système de pilotage, d'anticipation et d'aide à la décision pour PME (voir `PRD-Systeme-Pilotage-PME-v1.1 (1).md` et `docs/project-charter.md` à la racine).

- **Frontend** : Next.js (TypeScript, Tailwind) dans `frontend/` — code applicatif sous `frontend/src/{app,components,lib}`.
- **Backend** : FastAPI (Python) dans `backend/` — modules sous `backend/app/` (`main.py`, `models.py`, `schemas.py`, `database.py`, `routers/`, plus les domaines métier : `alerts.py`, `anomalies.py`, `ingestion.py`, `kpis.py`, `recommendations.py`, `reports.py`). Migrations via Alembic (`backend/alembic/`).
- **Base de données** : PostgreSQL, orchestrée par `docker-compose.yml` à la racine.
- **Design produit** : un skill dédié existe déjà pour l'identité visuelle et les maquettes — `skill/SKILL.md` (palette, typographie, composants signature). Ne pas réinventer de direction visuelle dans ce skill ni dans les sous-skills : router une demande de maquette/écran vers `skill` (le skill de design du projet), pas vers un skill ingénieur.
- Ce skill orchestrateur reste indépendant du design : il couvre uniquement le code (backend, frontend, données, infra, qualité, sécurité).

Toujours donner ce paragraphe (ou un résumé équivalent) en tête du prompt du sous-skill invoqué, plus le ou les fichiers précis concernés par la demande d'Issa.

## Table de routage

| Nature de la demande | Skill à invoquer | Notes |
|---|---|---|
| Endpoint API, logique métier backend, SQLAlchemy, Alembic | `engineering-skills:senior-backend` | Python/FastAPI |
| Écran, composant React/Next.js, état client, Tailwind | `engineering-skills:senior-frontend` | respecter la direction visuelle déjà tranchée dans `skill/SKILL.md` |
| Fonctionnalité qui traverse backend + frontend | `engineering-skills:senior-fullstack` | |
| Schéma de base de données, migration, modélisation relationnelle | `engineering-advanced-skills:database-schema-designer` ou `engineering-advanced-skills:sql-database-assistant` | PostgreSQL |
| Décision d'architecture, arbitrage technique structurant | `engineering-skills:senior-architect` | |
| Docker, docker-compose, déploiement, environnements | `engineering-skills:senior-devops` | |
| Pipeline CI/CD | `engineering-advanced-skills:ci-cd-pipeline-builder` | |
| Tests unitaires/intégration, stratégie TDD | `engineering-skills:tdd-guide` ou `engineering-skills:senior-qa` | |
| Suite de tests d'API | `engineering-advanced-skills:api-test-suite-builder` | |
| Revue de sécurité applicative, durcissement | `engineering-skills:senior-security` ou `security-review` (skill racine) | |
| Revue de code / diff avant merge | `code-review` (skill racine) ou `engineering-advanced-skills:pr-review-expert` | |
| Nettoyage, simplification du code déjà écrit | `simplify` (skill racine) | quand le code fonctionne mais mérite d'être resserré |
| Dette technique, priorisation de refactor | `engineering-advanced-skills:tech-debt-tracker` | |
| Lenteur, profilage, goulots d'étranglement | `engineering-advanced-skills:performance-profiler` | |
| Logs, métriques, alerting applicatif | `engineering-advanced-skills:observability-designer` | |
| Gestion des secrets / variables d'environnement | `engineering-advanced-skills:env-secrets-manager` | `.env` / `.env.example` du projet |
| Audit des dépendances (npm, pip) | `engineering-advanced-skills:dependency-auditor` | `requirements.txt`, `package.json` |
| Conception d'API (contrats, endpoints REST) | `engineering-advanced-skills:api-design-reviewer` | |
| Prise en main du code par quelqu'un de nouveau | `engineering-advanced-skills:codebase-onboarding` | |
| Vérifier qu'une fonctionnalité est prête à livrer | `engineering-advanced-skills:ship-gate` | |
| Bug précis et isolé, correction ciblée | `engineering-advanced-skills:focused-fix` | |

Si une demande touche clairement deux lignes (ex. « ajoute un endpoint et l'écran qui l'appelle »), router séquentiellement (backend puis frontend, ou l'inverse selon la dépendance), jamais en parallèle si l'un dépend du résultat de l'autre.

## Comment router

1. Identifier la couche et le type de travail (implémentation / revue / diagnostic) à partir de la demande d'Issa.
2. Chercher la ligne correspondante dans la table ci-dessus. En cas d'ambiguïté réelle entre deux lignes, poser la question de clarification plutôt que deviner.
3. Appeler l'outil Skill avec le skill choisi, en passant en `args` : le contexte du projet ci-dessus (résumé), les fichiers concernés déjà identifiés (chemins exacts si connus), et la demande précise d'Issa reformulée sans ambiguïté.
4. Ne pas dupliquer le travail du sous-skill : une fois routé, le laisser conduire l'implémentation ou la revue selon ses propres instructions.
5. Pour une tâche volumineuse ou exploratoire qui produirait beaucoup de sortie intermédiaire (ex. audit large, recherche dans tout le code), déléguer via un fork ou un agent dédié plutôt que de tout ramener dans le fil principal.
