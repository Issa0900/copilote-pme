# Contexte produit — Copilote PME

Condensé du PRD « Système intelligent de pilotage, d'anticipation et d'aide à la décision pour PME » (v1.1). Sert à ce que le design reste fidèle au produit sans avoir à relire le PRD complet à chaque écran.

## Vision

Une PME fonctionne sans directeur financier, sans analyste de données, sans directeur des opérations. Le propriétaire fait tout à la fois, avec des données déjà présentes mais dispersées entre Excel, le logiciel comptable, la banque, le CRM, Shopify, les courriels. Le produit connecte ces données, les analyse automatiquement, détecte anomalies, risques et opportunités, explique leurs causes, recommande des actions et en automatise certaines — sans que le propriétaire ait à devenir analyste.

Promesse fonctionnelle : Données → Information → Analyse → Risque/Opportunité → Décision → Action → Résultat.

Ce que le produit n'est pas : un logiciel comptable, un dashboard de plus, un CRM, un simple outil d'IA, un ERP. C'est une couche de pilotage intelligent au-dessus des systèmes existants.

Les trois questions auxquelles le propriétaire doit pouvoir répondre en se connectant : qu'est-ce qui se passe, qu'est-ce qui risque d'arriver, qu'est-ce que je devrais faire.

## Utilisateurs

**Propriétaire / dirigeant** — utilisateur principal. Besoin de comprendre rapidement l'entreprise, détecter les problèmes, savoir quoi prioriser, gagner du temps. C'est pour lui que l'écran d'accueil doit rester minimal (section 47).

**Gestionnaire** — suit les opérations, les KPI, les équipes, reçoit les alertes.

**Comptable** — accède aux données, vérifie les analyses, prépare des informations financières.

**Conseiller / consultant** — analyse plusieurs entreprises à la fois, produit des rapports, suit les recommandations. Implique un sélecteur d'organisation dans l'interface pour ce profil (voir Sécurité ci-dessous).

**Expert partenaire** (comptable, fiscaliste, avocat, consultant marketing ou RH, spécialiste automatisation) — orienté vers l'utilisateur par le système quand une situation dépasse ses capacités.

## Principes de confiance (section 44)

Le système distingue toujours cinq types d'affirmation, et le design doit rendre cette distinction visible en permanence, jamais implicite :

- **Fait** — donnée provenant d'une source interne.
- **Analyse** — interprétation du système.
- **Hypothèse** — possibilité non confirmée.
- **Recommandation** — action suggérée.
- **Prévision** — projection basée sur les données disponibles.

Objectif explicite du PRD : éviter de présenter une hypothèse comme une certitude. Voir le composant `TrustBadge`.

## Niveaux d'alerte (section 31)

| Niveau | Signification |
|---|---|
| Critique | intervention immédiate recommandée |
| Important | intervention prochaine |
| Surveillance | évolution à surveiller |
| Opportunité | possibilité intéressante |
| Information | pertinente, sans action immédiate |

## Catalogue KPI par domaine (module 5)

- **Finance** — chiffre d'affaires, marge brute, marge nette, dépenses, bénéfice, trésorerie, comptes clients, comptes fournisseurs.
- **Ventes** — volume, conversion, panier moyen, nouveaux clients, rétention, revenus par produit, revenus par client.
- **Opérations** — délais, commandes, productivité, utilisation des ressources, coûts opérationnels.
- **Marketing** — dépenses, leads, conversions, coût d'acquisition, ROI, revenus par campagne.

Le tableau de bord santé (module 4) agrège neuf dimensions : finance, ventes, trésorerie, clients, opérations, marketing, productivité, risques, croissance. Chaque dimension porte un score, une tendance, un niveau de confiance, une évolution et une explication — cinq attributs à prévoir systématiquement dans le composant de score.

## Portée du MVP (sections 37-38, 50)

Obligatoire au MVP : création d'entreprise, import Excel/CSV/PDF texte, dashboard, KPI, analyse IA, détection d'anomalies, recommandations, radar externe limité, détection de risques/opportunités, rapports quotidien/hebdomadaire/mensuel, assistant IA, centre d'alertes.

Explicitement reporté : ERP complet, paie, comptabilité complète, gestion RH complète, POS ou CRM propriétaires, application mobile native (le produit est web-first, responsive), rapports semestriel et annuel comme priorité de design, mémoire décisionnelle, radar externe approfondi, OCR et connecteurs bancaires avancés (Phase 2).

Concevoir un écran hors MVP seulement si Issa le demande explicitement — sinon, prioriser la liste de neuf écrans du SKILL.md.

## Sécurité et gouvernance pertinentes pour le design

- Séparation stricte des organisations (une IA ne doit jamais exposer les données d'une entreprise à une autre) — implique un sélecteur d'organisation explicite et sans ambiguïté pour les profils conseiller/consultant.
- Traçabilité complète de chaque fichier importé (qui, quand, quel contenu) — implique un historique d'imports consultable, pas seulement un état de succès/échec.
- Droit du propriétaire à l'accès, la rectification et la suppression de ses données, y compris les fichiers sources — implique un écran de gestion des données, même simple, dans les paramètres.
- Résidence des données au Canada et conformité à la Loi 25 — n'affecte pas directement l'écran, mais renforce le ton sérieux et digne de confiance plutôt que ludique.

## Stack technique cible (section 39, pour référence)

Frontend React / Next.js, backend Python / FastAPI, PostgreSQL. Utile pour calibrer le niveau de fidélité d'un artifact React si Issa veut un livrable proche du code final plutôt qu'une exploration visuelle.
