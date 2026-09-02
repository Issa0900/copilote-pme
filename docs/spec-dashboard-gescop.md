# Gescop — Spécification complète du Dashboard

## Design, graphiques, fonctionnalités, logique métier et règles de développement

**Produit :** Gescop  
**Type :** Super-SaaS d’intelligence décisionnelle pour PME  
**Version :** 1.0 — Spécification Dashboard  
**Date :** Septembre 2026  
**Stack cible :** Next.js + FastAPI + PostgreSQL

---

# 1. Vision du Dashboard

Le Dashboard de Gescop ne doit pas être un simple tableau de bord rempli de graphiques.

Son objectif est de transformer les données de l'entreprise en décisions :

> **Données → KPI → Détection → Explication → Impact → Prévision → Recommandation → Action → Mesure du résultat**

Le dashboard doit répondre rapidement à 7 questions :

1. Où en est mon entreprise ?
2. Qu'est-ce qui va bien ?
3. Qu'est-ce qui se dégrade ?
4. Pourquoi ?
5. Quel est l'impact financier ou opérationnel ?
6. Que dois-je faire maintenant ?
7. Est-ce que l'action recommandée a fonctionné ?

---

# 2. Principe UX fondamental

Chaque information importante doit suivre autant que possible cette structure :

**Signal → Preuve → Explication → Impact → Action**

Exemple :

> **Marge en baisse de 2,4 points**
>
> **Signal :** marge nette passée de 18,7 % à 16,3 %.
>
> **Preuve :** hausse de 7,8 % du coût moyen des produits.
>
> **Cause probable :** augmentation du coût fournisseur sur 4 catégories.
>
> **Impact estimé :** -4 850 $ de résultat mensuel.
>
> **Action recommandée :** revoir les prix des 12 produits concernés et négocier les coûts des 3 fournisseurs principaux.

L'IA ne doit jamais présenter une hypothèse comme un fait.

Utiliser :

- Cause probable
- Facteur associé
- Signal détecté
- Hypothèse
- Confiance estimée

---

# 3. Architecture générale du Dashboard

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo | Recherche Ctrl+K | Entreprise | Période | Sync | User│
├───────────────┬─────────────────────────────────────────────┤
│               │ Situation globale                            │
│ Dashboard     │ ┌───────────────┐ ┌──────────────────────┐  │
│               │ │ Santé 82/100  │ │ 3 priorités          │  │
│ Performance   │ └───────────────┘ └──────────────────────┘  │
│ Finance       │                                             │
│ Ventes        │ KPI principaux                              │
│ Marketing     │ [CA] [Marge] [Profit] [Cash] [CPA]         │
│ Opérations    │                                             │
│ RH            │ Performance                                 │
│               │ ┌─────────────────────────────────────────┐ │
│ Intelligence  │ │ Graphique CA / Marge / Objectif        │ │
│ Alertes       │ └─────────────────────────────────────────┘ │
│ Recommand.    │                                             │
│ Prévisions    │ Alertes       Recommandations               │
│ Simulations   │ ┌────────┐    ┌─────────────────────────┐  │
│               │ │ Alerte │    │ Action recommandée      │  │
│ Données       │ └────────┘    └─────────────────────────┘  │
│ Connecteurs   │                                             │
│ Qualité       │ Prévisions / Opportunités / Actions         │
│               │                                             │
│ Rapports      │ Sources et qualité des données              │
│ Paramètres    │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

---

# 4. Header

## Fonction

Le Header donne accès aux contrôles globaux.

### Éléments

- Logo Gescop
- Sélecteur d'entreprise
- Recherche globale
- Command Palette `Ctrl + K`
- Sélecteur de période
- Filtres
- Dernière synchronisation
- Bouton `+ Ajouter une source`
- Notifications
- Profil utilisateur

## Recherche globale

La commande `Ctrl + K` doit permettre de :

- rechercher une page ;
- rechercher un KPI ;
- rechercher une alerte ;
- rechercher une recommandation ;
- créer une analyse ;
- ajouter une source ;
- créer une tâche ;
- générer un rapport ;
- lancer une simulation ;
- poser une question à Gescop.

---

# 5. Sidebar

## Vue d'ensemble

- Dashboard

## Pilotage

- Performance
- Finance
- Ventes
- Marketing
- Opérations
- RH

## Intelligence

- Alertes
- Recommandations
- Analyses
- Prévisions
- Simulations

## Données

- Sources & connecteurs
- Qualité des données
- Importations
- Mapping
- Journal des données

## Rapports

- Rapports
- Rapports planifiés
- Rapports personnalisés

## Administration

- Entreprise
- Utilisateurs
- Rôles & permissions
- Paramètres
- Facturation

---

# 6. Situation globale

## But

Donner une lecture instantanée de l'entreprise sans obliger l'utilisateur à analyser 20 graphiques.

## Contenu

- Situation actuelle
- évolution récente
- principaux risques
- principales opportunités
- événements importants
- recommandations prioritaires

### Exemple

> **Situation stable, mais vigilance sur la rentabilité.**
>
> Le chiffre d'affaires progresse de 8,4 %, mais la marge nette recule de 2,1 points. La principale pression provient du coût des produits vendus.

## Type de visualisation

Pas de graphique obligatoire.

La priorité est :

- texte synthétique ;
- badges ;
- indicateurs ;
- alertes ;
- recommandations.

---

# 7. Score de santé

## But

Résumer la santé de l'entreprise avec un score de 0 à 100.

## Dimensions possibles

- Rentabilité
- Trésorerie
- Ventes
- Marketing
- Dépenses
- Opérations
- Stock
- RH
- Qualité des données

## Visualisation

Utiliser :

**Score radial / cercle de progression**

Exemple :

```text
          82
       ┌───────┐
       │ SANTÉ │
       └───────┘

Rentabilité      76
Trésorerie       91
Ventes           88
Marketing        74
Opérations       82
```

## Statuts

- 90–100 : Excellent
- 75–89 : Sain
- 60–74 : Stable
- 40–59 : Vigilance
- 20–39 : Risque
- 0–19 : Critique

## Règle importante

Le score global ne doit pas être une simple moyenne.

Une anomalie critique peut dégrader le statut global.

Exemple :

```text
Score moyen = 85
Trésorerie = situation critique
Statut final = RISQUE
```

---

# 8. KPI Cards

Les KPI doivent être immédiatement compréhensibles.

Chaque carte contient :

- Nom
- Valeur
- Variation
- Valeur précédente
- Objectif
- Écart à l'objectif
- Mini graphique
- Tendance
- Source
- Date de mise à jour
- Niveau de confiance

---

# 9. KPI principaux

## 9.1 Chiffre d'affaires

### But

Mesurer les ventes générées.

### Visualisation

**Sparkline** dans la KPI Card.

Puis détail :

**Line chart**

Axes :

- X = temps
- Y = CA

Découpages :

- jour
- semaine
- mois
- trimestre

Drill-down :

```text
CA
→ Canal
→ Région
→ Produit
→ Client
→ Commande
→ Transaction
```

---

# 10. Dépenses

## But

Comprendre l'évolution des coûts.

### Graphiques

**Line chart**

- dépenses dans le temps.

**Horizontal bar chart**

- dépenses par catégorie.

Exemple :

```text
Marketing       █████████████
Salaires        ███████████
Fournisseurs    █████████
Logiciels       █████
Transport       ███
```

### Fonctionnalité

Comparer :

- réel ;
- budget ;
- période précédente ;
- prévision.

---

# 11. Profit net

## But

Mesurer le résultat réellement généré.

### Visualisation

KPI + sparkline.

Puis :

**Line chart**

Afficher :

- CA
- dépenses
- profit

Cela permet de visualiser directement l'effet des dépenses sur le résultat.

---

# 12. Marge nette

## But

Mesurer la rentabilité relative.

### Graphique

**Line chart**

X = temps  
Y = marge %

Afficher :

- marge réelle ;
- objectif ;
- moyenne historique.

### Alerte

Si :

```text
Marge actuelle < objectif
ET
baisse > seuil
```

Créer une alerte.

---

# 13. Trésorerie

## But

Surveiller la capacité de l'entreprise à financer ses opérations.

### Graphique

**Line chart avec prévision**

Afficher :

- trésorerie réelle ;
- prévision ;
- seuil de sécurité ;
- zone de risque.

### Horizon

- 30 jours
- 60 jours
- 90 jours

```text
Cash
│                 ╭─── Prévision
│      Réel      ╱
│ ──────────────╯
│
│ ─ ─ ─ Seuil de sécurité
│
└──────────────────────── Temps
```

---

# 14. Panier moyen

## But

Mesurer la valeur moyenne d'une commande.

### Formule

```text
Panier moyen = CA / nombre de commandes
```

### Graphique

Line chart.

### Segments

- canal ;
- client ;
- produit ;
- région ;
- période.

---

# 15. Conversion

## But

Mesurer l'efficacité du parcours commercial.

### Graphique

**Funnel chart**

```text
Visiteurs
   ↓
Leads
   ↓
Prospects
   ↓
Opportunités
   ↓
Clients
   ↓
Ventes
```

Afficher le taux de conversion entre chaque étape.

---

# 16. Priorités

## But

Montrer les 3 à 5 sujets nécessitant une action.

Les priorités ne sont pas des graphiques.

Utiliser des **Priority Cards**.

### Chaque carte contient

- niveau de priorité ;
- problème ;
- KPI concerné ;
- impact ;
- cause probable ;
- urgence ;
- action recommandée ;
- bouton d'action.

### Score

```text
Priorité = Impact × Probabilité × Urgence
```

---

# 17. Alertes

## But

Détecter automatiquement les situations anormales.

## Catégories

- Critique
- Important
- Surveillance
- Information

## Alert Card

```text
🔴 Marge en baisse

Marge : 16,3 %
Variation : -2,4 pts

Impact estimé :
-4 850 $ / mois

Cause probable :
hausse du coût fournisseur

Confiance :
87 %

[Analyser] [Voir les produits] [Créer une action]
```

---

# 18. Moteur de détection

La détection doit d'abord être déterministe.

## Exemple

```python
if margin < target_margin and margin_change <= -3:
    create_alert("margin_decline")
```

L'IA intervient ensuite pour :

- expliquer ;
- contextualiser ;
- résumer ;
- proposer une action.

---

# 19. Performance générale

## But

Visualiser l'évolution globale.

### Graphique principal

**Line chart**

Afficher :

- réel ;
- objectif ;
- prévision.

### Interactions

- zoom ;
- changement de période ;
- comparaison ;
- filtre ;
- drill-down.

---

# 20. Performance par canal

## Graphique

**Horizontal bar chart**

Exemple :

```text
Site web       █████████████
Boutique       █████████
Marketplace    ██████
Téléphone      ████
```

Métriques sélectionnables :

- CA
- profit
- marge
- commandes
- croissance
- panier moyen

---

# 21. Performance produit

## Graphique principal

**Horizontal Top 10 bar chart**

Permettre de changer la métrique :

- CA
- profit
- marge
- volume
- croissance
- rentabilité

---

# 22. Matrice produits

## But

Identifier les produits qui génèrent du volume mais peu de rentabilité.

### Graphique

**Scatter plot**

X = volume  
Y = marge

Quadrants :

```text
          Marge élevée
               │
   Stars       │      Champions
               │
───────────────┼──────────────
               │
   Faibles     │      Volume
               │
          Marge faible
```

### Utilité

Identifier :

- produits à forte marge ;
- produits à fort volume ;
- produits à faible rentabilité ;
- produits à optimiser.

---

# 23. Marketing

## Objectif

Relier les dépenses marketing aux résultats commerciaux et financiers.

## Funnel marketing

```text
Budget
 ↓
Impressions
 ↓
Clics
 ↓
Visites
 ↓
Leads
 ↓
Conversions
 ↓
CA
 ↓
Profit
```

## Graphiques

### Dépenses

Bar chart par canal :

- Meta Ads
- Google Ads
- TikTok Ads
- Email
- autres

### ROAS

**Line chart**

```text
ROAS = CA attribué / dépenses publicitaires
```

### Campagnes

**Scatter plot**

X = dépenses  
Y = CA généré

Permet d'identifier les campagnes :

- fortes dépenses / fort CA ;
- fortes dépenses / faible CA ;
- faibles dépenses / fort CA.

---

# 24. Ventes

## Graphiques

### Funnel commercial

```text
Prospects
→ Leads qualifiés
→ Opportunités
→ Propositions
→ Ventes
```

### Évolution des ventes

Line chart.

### Ventes par vendeur

Horizontal bar chart.

### Ventes par produit

Horizontal bar chart.

### Ventes par canal

Bar chart.

---

# 25. Analyse clients

## But

Comprendre les clients les plus rentables.

## Segmentation

Bar chart par segment.

Exemples :

- nouveaux ;
- actifs ;
- VIP ;
- inactifs ;
- à risque.

## Clients actifs

Line chart.

## Cohortes

Cohort table / heatmap pour :

- rétention ;
- réachat ;
- valeur client.

---

# 26. Opérations et stock

## KPI

- valeur du stock ;
- rotation ;
- ruptures ;
- surstock ;
- produits dormants.

## Graphiques

### Stock par catégorie

Horizontal bar.

### Surstock

Horizontal bar.

### Valeur du stock

Line chart.

### Ruptures

Line chart + prévision.

---

# 27. Prévisions financières

## But

Anticiper les résultats.

### Graphique

**Line chart avec intervalle d'incertitude**

Afficher :

- historique ;
- prévision centrale ;
- scénario pessimiste ;
- scénario optimiste ;
- intervalle de confiance.

```text
Valeur
│           ╭────── Optimiste
│        ╭──┤
│     ╭──┤  ├──── Prévision
│─────┤  │
│     ╰──┤
│        ╰────── Pessimiste
└──────────────────── Temps
```

### Horizons

- 30 jours
- 60 jours
- 90 jours

---

# 28. Simulations

## But

Permettre à l'utilisateur de tester des décisions sans modifier les données réelles.

## Variables

- prix ;
- budget marketing ;
- volume des ventes ;
- coût fournisseur ;
- masse salariale ;
- dépenses ;
- recrutement.

## Exemple

```text
Budget marketing
[──────●────────]

+20 %

Résultat simulé :

CA : +7,8 %
Profit : +3,2 %
Marge : -0,4 pt
Risque : moyen
```

## Règle

Une simulation ne modifie jamais les données réelles.

---

# 29. Recommandations

Une recommandation doit être exploitable.

## Structure

```text
PROBLÈME
↓
PREUVES
↓
IMPACT
↓
ACTION
↓
RÉSULTAT ATTENDU
```

### Exemple

> **Réduire les dépenses sur la campagne X**
>
> CPA supérieur de 31 % à la moyenne.
>
> Impact estimé : économie de 1 200 $/mois.
>
> Action : réduire le budget de 20 %.
>
> Résultat attendu : CPA -12 à -18 %.

Boutons :

- Appliquer
- Créer une tâche
- Ignorer
- Analyser
- Voir les données

---

# 30. Opportunités

Les opportunités sont la version positive des alertes.

## Exemples

- produit à fort potentiel ;
- client susceptible de racheter ;
- campagne sous-investie ;
- opportunité de cross-sell ;
- marché géographique en croissance ;
- produit à forte marge.

### Opportunity Card

Afficher :

- opportunité ;
- preuve ;
- potentiel ;
- confiance ;
- action.

---

# 31. Centre d'actions

Une recommandation doit pouvoir devenir une action.

## Champs

- titre ;
- responsable ;
- priorité ;
- échéance ;
- origine ;
- impact estimé ;
- statut.

## Statuts

- À faire
- En cours
- Bloquée
- Terminée
- Annulée

---

# 32. Mesure des résultats

Gescop doit fermer la boucle.

## Méthode

```text
AVANT
↓
ACTION
↓
APRÈS
↓
MESURE
```

### Exemple

```text
CPA avant       28,40 $
Action          modification budget
CPA après       21,10 $

Résultat        -25,7 %
Objectif        atteint
```

Cette fonctionnalité permet à Gescop de mesurer quelles recommandations produisent réellement des résultats.

---

# 33. Sources et connecteurs

## Connecteurs prioritaires

- QuickBooks
- Shopify
- Excel
- CSV
- Google Analytics
- Meta Ads
- Acomba
- WooCommerce
- Lightspeed
- Square
- Google Ads
- HubSpot
- Pipedrive
- Salesforce
- Zoho
- TikTok Ads
- Mailchimp
- Klaviyo

## Connector Card

Afficher :

- nom ;
- statut ;
- dernière synchronisation ;
- fréquence ;
- nombre de données ;
- erreurs ;
- types de données récupérées.

### Statuts

- Connecté
- Synchronisation
- Attention
- Erreur
- Déconnecté

---

# 34. Qualité des données

## Score

0–100.

## Dimensions

- Complétude
- Exactitude
- Fraîcheur
- Cohérence
- Doublons

### Visualisation

Utiliser des progress bars plutôt qu'un camembert.

```text
Complétude      █████████░ 91
Exactitude      ████████░░ 84
Fraîcheur       ██████████ 98
Cohérence       ████████░░ 86
Doublons        █████████░ 93
```

---

# 35. Confiance des données

Chaque KPI important doit pouvoir afficher son niveau de confiance.

Exemple :

```text
CA : 248 430 $
Confiance : élevée

Sources :
✓ Shopify
✓ POS
✓ Comptabilité

Fraîcheur : 2 h
Complétude : 97 %
```

---

# 36. Analyse de corrélation

## But

Chercher des relations entre variables.

### Scatter plots

Exemples :

- budget marketing ↔ CA ;
- prix ↔ volume ;
- CPA ↔ conversion ;
- stock ↔ ventes ;
- effectif commercial ↔ CA.

## Règle

Toujours préciser :

> **Corrélation ≠ causalité.**

L'IA doit éviter de transformer une corrélation en causalité certaine.

---

# 37. Assistant « Demander à Gescop »

L'assistant doit être connecté aux données internes.

## Questions possibles

- Pourquoi ma marge baisse ?
- Quel produit est le plus rentable ?
- Pourquoi les ventes ont-elles baissé ?
- Que dois-je prioriser ?
- Quel canal marketing est le plus rentable ?
- Quels clients risquent de partir ?
- Que risque ma trésorerie dans 30 jours ?
- Quelles dépenses devrais-je surveiller ?

## Réponse idéale

```text
Réponse courte
↓
Preuves
↓
Analyse
↓
Impact
↓
Recommandation
↓
Sources utilisées
```

---

# 38. Drill-down universel

Chaque KPI doit pouvoir être exploré.

Exemple :

```text
CA
↓
Canal
↓
Québec
↓
Catégorie
↓
Produit
↓
Commande
↓
Transaction
```

L'utilisateur doit pouvoir passer d'un indicateur stratégique à la donnée transactionnelle.

---

# 39. Règle de choix des graphiques

| Besoin | Graphique |
|---|---|
| Évolution temporelle | Line chart |
| Comparaison catégories | Bar chart |
| Top 10 | Horizontal bar |
| Part du total | Donut, avec parcimonie |
| Tunnel | Funnel |
| Corrélation | Scatter plot |
| Composition | Stacked bar |
| Stock | Line + bar |
| Prévision | Line + intervalle |
| KPI instantané | KPI Card |
| Score | Radial / Score Card |
| Données détaillées | Table |
| Géographie pertinente | Map |

---

# 40. Ne pas mettre un graphique partout

Une erreur classique serait de transformer Gescop en Power BI miniature.

Mauvais :

```text
Graphique
Graphique
Graphique
Graphique
Graphique
```

Bon :

```text
Signal
↓
Explication
↓
Graphique de preuve
↓
Impact
↓
Action
```

Les graphiques sont des preuves dans une chaîne décisionnelle.

---

# 41. Architecture des données

Gescop doit séparer les couches.

```text
SOURCES
↓
RAW
↓
NORMALIZED
↓
ANALYTICS
↓
KPI
↓
RULES ENGINE
↓
AI
↓
RECOMMENDATIONS
↓
ACTIONS
↓
MEASUREMENT
```

## Sources

- Shopify
- QuickBooks
- Acomba
- Meta Ads
- Google Analytics
- CSV
- Excel
- POS

## RAW

Données originales.

## NORMALIZED

Données harmonisées.

## ANALYTICS

Données préparées pour les analyses.

---

# 42. Modèle de données analytique

## Dimensions

```text
dim_company
dim_customer
dim_product
dim_supplier
dim_employee
dim_campaign
dim_channel
dim_date
```

## Facts

```text
fact_sales
fact_expenses
fact_transactions
fact_marketing
fact_inventory
fact_payroll
fact_cashflow
```

---

# 43. API Backend

Architecture recommandée :

```text
backend/
├── auth/
├── connectors/
├── ingestion/
├── normalization/
├── kpis/
├── analytics/
├── anomaly/
├── forecast/
├── recommendation/
├── ai/
├── reporting/
├── notifications/
└── audit/
```

---

# 44. Services principaux

## Authentication Service

Gestion :

- login ;
- sessions ;
- MFA ;
- sécurité.

## Connector Service

Gestion :

- OAuth ;
- API ;
- synchronisation ;
- tokens ;
- erreurs.

## Ingestion Service

Import :

- CSV ;
- TSV ;
- XLSX ;
- XLS ;
- PDF.

## Normalization Service

Uniformisation :

- dates ;
- devises ;
- catégories ;
- produits ;
- clients ;
- unités.

## KPI Service

Calcul déterministe des KPI.

## Anomaly Service

Détection des anomalies.

## Forecast Service

Prévisions.

## Recommendation Service

Génération de recommandations structurées.

## AI Service

Explication, synthèse et interaction conversationnelle.

---

# 45. Format d'un KPI

Chaque KPI doit retourner une structure similaire :

```json
{
  "value": 248430,
  "previous_value": 231200,
  "variation": 7.45,
  "target": 250000,
  "target_gap": -0.63,
  "trend": "up",
  "status": "healthy",
  "confidence": 0.94,
  "source": [
    "shopify",
    "quickbooks"
  ],
  "last_updated": "2026-09-01T18:30:00"
}
```

---

# 46. Performance technique

Le Dashboard doit être rapide.

## Techniques

- cache ;
- agrégations ;
- materialized views ;
- requêtes optimisées ;
- pagination ;
- lazy loading ;
- background jobs ;
- ingestion incrémentale ;
- pré-calcul des KPI ;
- index PostgreSQL.

## Objectif UX

Les KPI principaux doivent apparaître rapidement même lorsque l'entreprise possède beaucoup de données.

---

# 47. Responsive Design

Desktop-first mais responsive.

## Desktop

```text
Sidebar + contenu
```

## Tablet

```text
Sidebar compacte
2 colonnes
```

## Mobile

```text
Header
↓
KPI
↓
Priorités
↓
Alertes
↓
Graphiques
↓
Actions
```

Les graphiques doivent rester lisibles sans scroll horizontal inutile.

---

# 48. Design System

## Style

Gescop doit avoir une apparence :

- moderne ;
- professionnelle ;
- sobre ;
- premium ;
- orientée décision ;
- dense mais respirante.

## Éviter

- gradients excessifs ;
- cartes géantes ;
- ombres lourdes ;
- animations inutiles ;
- trop de couleurs ;
- graphiques décoratifs.

## Couleurs fonctionnelles

Les couleurs doivent avoir une signification.

- vert = positif ;
- rouge = risque ;
- orange = vigilance ;
- bleu = information ;
- gris = neutre.

Ne jamais utiliser la couleur comme seul moyen d'information.

---

# 49. Composants frontend

Créer des composants réutilisables.

```text
KPICard
HealthScore
MetricBadge
ConfidenceBadge
AlertCard
PriorityCard
RecommendationCard
OpportunityCard
ActionCard
ForecastCard
InsightCard
ChartCard
DataQualityCard
ConnectorCard
SimulationCard
DataTable
FilterBar
PeriodSelector
DrilldownPanel
```

---

# 50. Organisation frontend

```text
app/
├── dashboard/
├── finance/
├── sales/
├── marketing/
├── operations/
├── hr/
├── intelligence/
│   ├── alerts/
│   ├── recommendations/
│   ├── forecasts/
│   └── simulations/
├── connectors/
├── data-quality/
├── reports/
└── settings/
```

---

# 51. Système d'alertes

Une alerte doit posséder :

```text
id
type
severity
title
description
kpi
current_value
previous_value
variation
impact
probable_cause
confidence
created_at
status
recommended_action
```

## Exemple

```json
{
  "type": "margin_decline",
  "severity": "high",
  "title": "Marge en baisse",
  "variation": -2.4,
  "impact": -4850,
  "probable_cause": "Hausse des coûts fournisseurs",
  "confidence": 0.87
}
```

---

# 52. Score de priorité

Formule conceptuelle :

```text
Priority Score =
Impact × Probability × Urgency
```

Normaliser sur 100.

```text
90–100 = Critique
75–89  = Haute
50–74  = Moyenne
25–49  = Faible
0–24   = Information
```

---

# 53. Onboarding

Le premier parcours doit être extrêmement simple.

```text
1. Créer entreprise
        ↓
2. Connecter une source
        ↓
3. Vérifier les données
        ↓
4. Définir objectifs
        ↓
5. Première analyse
        ↓
6. Première recommandation
```

Objectif :

> obtenir une première valeur décisionnelle rapidement.

---

# 54. État vide

Un état vide doit toujours proposer une prochaine action.

### Mauvais

> Aucun graphique disponible.

### Bon

> **Finance non connectée**
>
> Connectez QuickBooks ou importez un fichier CSV pour commencer l'analyse financière.
>
> `[Connecter QuickBooks]` `[Importer CSV]`

---

# 55. Sécurité

Le système doit prévoir :

- isolation multi-tenant ;
- RBAC ;
- authentification sécurisée ;
- autorisation par ressource ;
- chiffrement ;
- gestion sécurisée des tokens ;
- audit logs ;
- journalisation ;
- sauvegardes ;
- contrôle d'accès aux données.

---

# 56. Tests

## Unit tests

Tester :

- KPI ;
- calculs ;
- règles ;
- transformations ;
- normalisation.

## Integration tests

Tester :

- connecteurs ;
- API ;
- PostgreSQL ;
- ingestion ;
- synchronisation.

## E2E

Tester :

```text
Login
→ connexion source
→ synchronisation
→ dashboard
→ alerte
→ analyse
→ recommandation
→ action
→ rapport
```

---

# 57. Observabilité

Surveiller :

- latence API ;
- latence DB ;
- erreurs connecteurs ;
- erreurs ingestion ;
- erreurs KPI ;
- erreurs IA ;
- échecs jobs ;
- temps de synchronisation ;
- qualité des données.

---

# 58. Architecture décisionnelle complète

Le système Gescop doit fonctionner comme une boucle.

```text
              ┌───────────────┐
              │   SOURCES     │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │   INGESTION   │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │ NORMALISATION │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │   ANALYTICS   │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │     KPI       │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │ RULES ENGINE  │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │      IA       │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │ RECOMMANDATION│
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │    ACTION     │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │   MESURE      │
              └───────┬───────┘
                      │
                      └──────────→ apprentissage
```

---

# 59. Positionnement stratégique

Gescop ne doit pas chercher à être :

> « un autre logiciel de graphiques ».

Il doit être :

> **la couche d'intelligence qui transforme les données dispersées d'une PME en décisions concrètes.**

Différence fondamentale :

```text
ERP
= Enregistrer

CRM
= Gérer les clients

Outils marketing
= Exécuter les campagnes

Comptabilité
= Comptabiliser

BI
= Visualiser

Gescop
= Comprendre + anticiper + recommander + agir + mesurer
```

---

# 60. Expérience utilisateur cible

L'utilisateur ouvre Gescop.

Il ne doit pas immédiatement voir 40 graphiques.

Il doit voir :

```text
┌───────────────────────────────────────────┐
│ COMMENT VA MON ENTREPRISE ?               │
│                                           │
│ Santé : 82/100 — Sain                     │
│                                           │
│ 3 sujets nécessitent votre attention      │
│                                           │
│ 🔴 Marge -2,4 pts                         │
│ 🟠 CPA +18 %                              │
│ 🟢 Opportunité : produit X                │
│                                           │
│ Gescop recommande :                       │
│ Revoir les prix de 12 produits            │
│                                           │
│ Impact potentiel : +4 850 $/mois          │
│                                           │
│ [Analyser] [Créer l'action]               │
└───────────────────────────────────────────┘
```

Ensuite seulement :

**KPI → graphiques → détails → transactions.**

---

# 61. Règle d'or du développement

Chaque fonctionnalité doit répondre à au moins une question :

- Est-ce que cela aide à comprendre ?
- Est-ce que cela aide à détecter ?
- Est-ce que cela aide à expliquer ?
- Est-ce que cela aide à prévoir ?
- Est-ce que cela aide à décider ?
- Est-ce que cela aide à agir ?
- Est-ce que cela aide à mesurer le résultat ?

Si la réponse est non, la fonctionnalité doit être questionnée.

---

# 62. Roadmap Dashboard MVP

## Phase 1 — Fondation

- Layout
- Sidebar
- Header
- Auth
- Entreprise
- Périodes
- Filtres

## Phase 2 — Données

- CSV
- Excel
- QuickBooks
- Shopify
- Google Analytics
- Meta Ads

## Phase 3 — Intelligence

- KPI Engine
- Rules Engine
- Alertes
- Score santé
- Priorités

## Phase 4 — Décision

- Recommandations
- Assistant Gescop
- Drill-down
- Prévisions

## Phase 5 — Action

- Actions
- Suivi
- Mesure avant/après

## Phase 6 — Expansion

- Acomba
- WooCommerce
- Lightspeed
- Square
- Google Ads
- CRM
- Email marketing
- Simulations avancées

---

# 63. Critère de réussite du Dashboard

Le dashboard est réussi si un dirigeant peut, en moins de quelques minutes :

1. comprendre l'état de son entreprise ;
2. identifier ses trois principaux problèmes ;
3. comprendre pourquoi ils existent ;
4. connaître leur impact ;
5. voir les risques futurs ;
6. recevoir des recommandations ;
7. transformer une recommandation en action ;
8. mesurer ensuite si l'action a fonctionné.

> **Gescop ne doit pas seulement montrer les données de l'entreprise.**
>
> **Gescop doit aider l'entreprise à savoir quoi faire avec ses données.**