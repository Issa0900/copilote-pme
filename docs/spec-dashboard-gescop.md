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

---

# 64. Critères d'acceptation du MVP

Cette section définit les conditions minimales permettant de considérer le MVP de Gescop comme fonctionnel, testable et livrable.

Le MVP n'a pas besoin de contenir toutes les fonctionnalités avancées prévues dans la vision complète. Il doit cependant démontrer la boucle fondamentale de Gescop :

```text
Connecter → Importer → Normaliser → Calculer → Détecter
→ Expliquer → Recommander → Agir → Mesurer
```

## 64.1 Critères globaux de validation

Le MVP est accepté uniquement si :

- un utilisateur peut créer un compte ;
- un utilisateur peut créer ou sélectionner une entreprise ;
- les données d'au moins une source peuvent être importées ;
- les données importées sont validées avant analyse ;
- les données sont normalisées ;
- les KPI principaux sont calculés automatiquement ;
- le Dashboard affiche les KPI sans intervention manuelle du développeur ;
- les données peuvent être filtrées par période ;
- les variations par rapport à une période précédente sont calculées ;
- au moins un système de détection d'anomalies fonctionne ;
- au moins une alerte peut être générée automatiquement ;
- l'alerte contient une explication basée sur les données ;
- une recommandation peut être générée à partir d'une alerte ;
- une recommandation peut être transformée en action ;
- une action peut être marquée comme terminée ;
- le résultat avant/après peut être affiché ;
- aucune donnée d'une entreprise ne peut être visible par une autre entreprise ;
- les erreurs importantes sont affichées clairement à l'utilisateur ;
- les tests principaux passent ;
- le parcours complet peut être exécuté sans intervention technique.

## 64.2 Authentification et accès

L'utilisateur doit pouvoir créer un compte, se connecter, se déconnecter, récupérer son accès, et accéder uniquement aux données auxquelles il est autorisé.

**Critères d'acceptation**

- Une inscription valide crée un utilisateur.
- Un utilisateur existant peut se connecter.
- Un mauvais mot de passe affiche une erreur claire.
- Une session non authentifiée ne peut pas accéder au Dashboard.
- La déconnexion invalide correctement la session.
- Les endpoints backend protégés refusent les requêtes non autorisées.
- Les données sont isolées par `company_id` / tenant.
- Un utilisateur ne peut jamais récupérer les données d'une autre entreprise en modifiant un ID dans l'URL ou l'API.

## 64.3 Création de l'entreprise

**Champs MVP :** nom, secteur, devise, pays/région, taille approximative.

**Critères d'acceptation**

- Une entreprise peut être créée.
- L'entreprise est associée au bon utilisateur.
- La devise est enregistrée.
- Les paramètres de l'entreprise sont persistés en base.
- L'utilisateur est redirigé vers l'onboarding.

## 64.4 Onboarding

```text
Créer entreprise → Ajouter une source → Importer / synchroniser
→ Valider les données → Calculer les KPI → Afficher le Dashboard
```

**Critères d'acceptation**

- L'utilisateur comprend clairement la prochaine étape.
- Une progression de l'onboarding est visible.
- L'utilisateur peut ignorer une étape lorsque cela est prévu.
- Une erreur de connexion/import est expliquée.
- Après une première importation valide, l'utilisateur peut accéder au Dashboard.
- Le Dashboard n'affiche pas de faux KPI lorsqu'aucune donnée n'existe.

## 64.5 Importation de données

Le MVP doit supporter au minimum CSV, Excel, et au moins une intégration externe prioritaire. La première version peut utiliser CSV/Excel comme source universelle si les connecteurs API ne sont pas encore terminés.

**Critères d'acceptation**

- Un fichier valide peut être importé.
- Les formats autorisés sont contrôlés.
- La taille maximale du fichier est contrôlée.
- Les colonnes sont détectées.
- Les colonnes inconnues sont signalées.
- Les dates sont correctement reconnues.
- Les montants sont correctement reconnus.
- Les lignes invalides sont signalées.
- Les doublons peuvent être détectés.
- L'utilisateur peut voir un aperçu avant validation.
- L'importation ne crée pas de données partielles silencieusement en cas d'échec.
- L'importation est journalisée.

## 64.6 Normalisation

Transformer les données provenant de différentes sources dans un format commun (`"Date de vente"`, `"sale_date"`, `"transaction_date"` → `sale_date`).

**Critères d'acceptation**

- Les dates utilisent un format interne uniforme.
- Les montants utilisent une devise définie.
- Les noms de colonnes sont normalisés.
- Les catégories peuvent être harmonisées.
- Les produits similaires peuvent être identifiés.
- Les clients peuvent être identifiés de façon cohérente.
- Les données RAW restent conservées.
- Les données normalisées sont séparées des données RAW.
- Une erreur de normalisation ne détruit jamais les données originales.

## 64.7 KPI MVP

Le MVP doit calculer au minimum : chiffre d'affaires, dépenses, profit net, marge nette, nombre de ventes/commandes, panier moyen, et trésorerie lorsque les données nécessaires sont disponibles.

**Critères d'acceptation** — pour chaque KPI :

- la formule est définie ;
- le calcul est effectué côté backend ;
- la valeur est correcte ;
- la période est identifiable ;
- la période précédente est calculable ;
- la variation est calculée ;
- l'objectif peut être affiché lorsqu'il existe ;
- la source des données est identifiable ;
- la date de dernière mise à jour est disponible ;
- le KPI indique lorsqu'il manque suffisamment de données ;
- le frontend ne recalcule pas les valeurs financières critiques.

## 64.8 KPI — critères de précision

```text
Résultat attendu = Résultat backend = Résultat vérifié sur données de test
```

- Les formules sont couvertes par des unit tests.
- Les cas de division par zéro sont gérés.
- Les valeurs nulles sont gérées.
- Les périodes sans données sont gérées.
- Les remboursements sont traités selon les règles définies.
- Les montants négatifs sont traités correctement.
- Les arrondis sont cohérents.
- Les devises sont respectées.

## 64.9 Dashboard principal

```text
Situation globale → Score de santé → KPI principaux
→ Performance → Priorités → Alertes → Recommandations
```

**Critères d'acceptation**

- Le Dashboard se charge avec une entreprise valide.
- Les KPI correspondent aux données sélectionnées.
- Le sélecteur de période fonctionne.
- Les composants réagissent aux filtres.
- Aucun graphique ne présente de données appartenant à une autre période.
- Les états de chargement sont visibles.
- Les états vides sont explicites.
- Les erreurs sont affichées sans casser toute la page.
- Les données sont actualisées après synchronisation.

## 64.10 Score de santé

Le score peut commencer avec un nombre limité de dimensions : Rentabilité, Ventes, Dépenses, Trésorerie.

**Critères d'acceptation**

- Le score est compris entre 0 et 100.
- Le calcul est effectué côté backend.
- Les dimensions contribuant au score sont visibles.
- Le statut est déterminé automatiquement.
- Une situation critique peut modifier le statut global.
- Le score ne change pas arbitrairement.
- Le score peut être recalculé après mise à jour des données.
- La logique du score est documentée.

## 64.11 Graphiques MVP

1. **CA dans le temps** — line chart
2. **Dépenses par catégorie** — horizontal bar chart
3. **Profit / CA / dépenses** — line chart
4. **Performance par canal** — bar chart
5. **Top produits** — horizontal bar chart
6. **Prévision** — line chart + intervalle, si le module de prévision est inclus dans le MVP

**Critères d'acceptation**

- Chaque graphique possède un titre clair.
- Les axes sont compréhensibles.
- Les unités sont affichées.
- Les périodes sont visibles.
- Les tooltips donnent les valeurs exactes.
- Les graphiques répondent aux filtres globaux.
- Les données peuvent être comparées lorsque pertinent.
- Aucun graphique n'est utilisé uniquement à des fins décoratives.

## 64.12 Détection d'anomalies

Le MVP doit contenir au minimum 3 règles déterministes.

```text
Marge    : si marge < objectif ET variation négative > seuil → alerte
Dépenses : si dépenses catégorie > moyenne historique + seuil → alerte
Ventes   : si ventes actuelles < moyenne historique - seuil → alerte
```

**Critères d'acceptation**

- Les règles sont exécutées automatiquement.
- Une règle possède un seuil configurable.
- Les règles utilisent des données réelles.
- Une anomalie ne génère pas plusieurs alertes identiques inutilement.
- Les alertes peuvent être classées par sévérité.
- Les règles peuvent être testées indépendamment.
- Les résultats des règles sont traçables.

## 64.13 Alertes

Chaque alerte MVP doit contenir : titre, sévérité, KPI, valeur, variation, impact, cause probable, confiance, date, action recommandée.

**Critères d'acceptation**

- Une alerte peut être générée automatiquement.
- Une alerte indique clairement le problème.
- La valeur actuelle est affichée.
- La comparaison est affichée.
- L'impact est affiché lorsque calculable.
- La cause est identifiée comme « probable » lorsqu'elle n'est pas certaine.
- Le niveau de confiance est affiché lorsque l'analyse utilise des hypothèses.
- L'utilisateur peut ouvrir le détail.
- L'utilisateur peut ignorer ou clôturer l'alerte.

## 64.14 Explication par l'IA

L'IA ne doit pas calculer les KPI financiers fondamentaux. Elle doit exploiter les résultats calculés par le backend.

**Critères d'acceptation**

- L'IA reçoit des données structurées.
- L'IA ne peut pas inventer une transaction.
- Les chiffres présentés correspondent aux données backend.
- Les hypothèses sont identifiées comme telles.
- La réponse peut indiquer les données utilisées.
- Une réponse IA échouée ne bloque pas le Dashboard.
- Les erreurs IA sont gérées proprement.

## 64.15 Recommandations

```text
Problème → Preuve → Impact → Action → Résultat attendu
```

**Critères d'acceptation**

- Une recommandation possède une origine identifiable.
- Elle est reliée à une alerte ou analyse.
- Elle cite les indicateurs utilisés.
- Elle fournit une action concrète.
- Elle indique l'impact estimé lorsqu'il est calculable.
- Elle distingue les faits des hypothèses.
- L'utilisateur peut accepter la recommandation.
- L'utilisateur peut la rejeter.
- L'utilisateur peut créer une tâche à partir d'elle.

## 64.16 Centre d'actions

**Critères d'acceptation**

- Une recommandation peut devenir une action.
- Une action possède un titre, un statut, une priorité, une échéance, un assigné.
- Une action peut être marquée comme terminée.
- L'origine de l'action est conservée.
- Une action terminée reste consultable.

## 64.17 Mesure avant / après

**Critères d'acceptation**

- Une action peut être associée à un KPI.
- La valeur avant l'action est conservée.
- La valeur après l'action peut être calculée.
- La variation est calculée.
- L'objectif peut être comparé au résultat.
- Le résultat peut être affiché dans l'action.

## 64.18 Sources de données

- Chaque donnée analytique peut être reliée à une source.
- La dernière synchronisation est visible.
- Une source en erreur est identifiable.
- Une source déconnectée est identifiable.
- L'utilisateur peut lancer une synchronisation lorsqu'elle est disponible.
- Les erreurs de synchronisation sont journalisées.

## 64.19 Qualité des données

Le MVP doit au minimum détecter : données manquantes, doublons, données anciennes, colonnes inconnues, incohérences importantes.

**Critères d'acceptation**

- Un score de qualité peut être calculé.
- Les problèmes sont détaillés.
- Chaque problème possède une description.
- Une action corrective est proposée lorsqu'elle est connue.
- Une mauvaise qualité des données réduit le niveau de confiance du KPI.

## 64.20 Filtres

Période, source, canal lorsque disponible, catégorie lorsque disponible.

- Modifier la période met à jour les KPI, les graphiques et les alertes lorsque pertinent.
- Les filtres sont cohérents entre les composants.
- L'utilisateur peut réinitialiser les filtres.

## 64.21 Drill-down

Le MVP doit proposer au moins un parcours de drill-down (ex. `CA → Canal → Produit → Commande`).

- Un KPI est cliquable.
- L'utilisateur peut consulter le détail.
- Le filtre sélectionné est conservé.
- Le niveau de détail est cohérent avec le KPI.
- L'utilisateur peut revenir au niveau précédent.

## 64.22 États UI

Chaque composant doit gérer 5 états : `Loading`, `Success`, `Empty`, `Error`, `Stale`.

- Aucun écran blanc en cas d'erreur backend.
- Données anciennes signalées lorsque nécessaire.

## 64.23 Responsive

Desktop (4 colonnes max selon la section), tablette (2 colonnes), mobile (1 colonne).

- Aucun élément critique n'est inaccessible.
- Les KPI restent lisibles, les graphiques utilisables, les actions principales accessibles.
- La navigation mobile fonctionne.

## 64.24 Performance

- Dashboard initial : idéalement < 2–3 s sur données pré-calculées.
- API KPI : idéalement < 500 ms pour les requêtes courantes.
- Navigation entre vues principales : rapide et sans rechargement complet.
- Calculs lourds : background jobs.
- Les KPI ne déclenchent pas inutilement plusieurs requêtes identiques.
- Les requêtes principales sont indexées, les listes importantes paginées, le cache utilisé lorsqu'approprié.

## 64.25 Sécurité et isolation multi-tenant

**Critère bloquant du MVP.**

- Chaque donnée possède une relation avec une entreprise.
- Les requêtes backend filtrent par tenant.
- Les endpoints vérifient les permissions.
- Un utilisateur ne peut pas accéder à une autre entreprise.
- Les secrets/API keys ne sont jamais exposés au frontend.
- Les tokens de connecteurs sont stockés de manière sécurisée.
- Les actions importantes sont journalisées.

## 64.26 Tests MVP

**Unit tests obligatoires :** calcul CA, dépenses, profit, marge, panier moyen, variations, score santé, règles d'alertes, normalisation, calcul de priorité.

**Integration tests :** import, PostgreSQL, API KPI, pipeline RAW → NORMALIZED → ANALYTICS, génération d'alertes.

**E2E obligatoire :**

```text
Créer compte → Créer entreprise → Importer CSV → Valider données
→ Dashboard → Consulter KPI → Détection anomalie → Alerte → Analyse
→ Recommandation → Créer action → Terminer action → Mesurer résultat
```

## 64.27 Critères d'acceptation du parcours complet

Le MVP est fonctionnel si un testeur **non technique** peut réaliser ce parcours sans intervention du développeur :

1. Se connecter
2. Créer une entreprise
3. Importer un fichier
4. Voir la qualité des données
5. Voir les KPI
6. Changer la période
7. Identifier une anomalie
8. Ouvrir l'alerte
9. Comprendre la cause probable
10. Voir l'impact
11. Voir la recommandation
12. Créer une action
13. Terminer l'action
14. Consulter le résultat

## 64.28 Critères de qualité UX

- L'utilisateur comprend immédiatement où il se trouve.
- Les KPI principaux sont visibles sans scroll excessif.
- Les problèmes importants sont plus visibles que les informations secondaires.
- Les graphiques ne sont jamais utilisés sans objectif.
- Les CTA sont compréhensibles.
- Les messages d'erreur sont actionnables.
- Les termes techniques sont évités dans l'interface destinée au dirigeant.
- Une recommandation indique toujours pourquoi elle est proposée.
- Une hypothèse IA n'est jamais présentée comme une certitude.
- L'utilisateur peut retrouver la donnée ayant servi à une conclusion.

## 64.29 Critères de non-acceptation

Le MVP doit être **refusé** si l'un des éléments suivants est présent :

- données incorrectes dans les KPI critiques ;
- fuite de données entre entreprises ;
- calcul financier effectué uniquement côté frontend ;
- alertes inventées ou basées sur des données inexistantes ;
- recommandations sans preuve ;
- IA présentant une hypothèse comme un fait ;
- impossibilité de savoir d'où vient un KPI ;
- Dashboard inutilisable lorsqu'une source est vide ;
- absence de gestion des erreurs ;
- impossibilité de tester le parcours principal ;
- fonctionnalités critiques dépendant d'une intervention manuelle du développeur.

## 64.30 Definition of Done — fonctionnalité

```text
Code → API → UI → Validation données
→ États Loading / Empty / Error → Tests → Sécurité
→ Documentation → Validation UX
```

Une fonctionnalité ne doit pas être considérée comme terminée simplement parce que « le frontend fonctionne ».

## 64.31 Definition of Done — MVP complet

Le MVP est DONE lorsque : le parcours principal fonctionne de bout en bout ; les données peuvent être importées et normalisées ; les KPI sont calculés correctement ; le Dashboard et les graphiques principaux fonctionnent ; les anomalies sont détectées ; les alertes fonctionnent ; l'IA peut expliquer les principaux signaux ; les recommandations sont générées et peuvent devenir des actions ; les actions peuvent être suivies ; les résultats avant/après peuvent être mesurés ; les données sont isolées par entreprise ; les tests critiques passent ; les erreurs critiques sont gérées ; l'expérience est utilisable par un dirigeant sans formation technique.

## 64.32 Priorisation des critères

**P0 — Bloquant.** Authentification · Isolation multi-tenant · Importation · Normalisation · KPI corrects · Dashboard · Alertes · Sécurité · Gestion des erreurs · Tests critiques

**P1 — Nécessaire.** Score santé · Recommandations · Assistant IA · Drill-down · Actions · Qualité des données · Mesure avant/après · Prévisions simples

**P2 — Post-MVP.** Simulations avancées · Cohortes avancées · CRM complet · RH complet · Cartographie · Automatisations complexes · Connecteurs avancés · Rapports très personnalisables · Agents IA autonomes

## 64.33 Test ultime du MVP

> « Si je donne Gescop à un dirigeant de PME qui ne connaît pas le système, peut-il connecter ses données, comprendre sa situation, identifier un problème important, comprendre pourquoi il existe, voir son impact et savoir quoi faire ensuite ? »

Si la réponse est oui, le MVP démontre la proposition de valeur fondamentale de Gescop. Si la réponse est non, il faut prioriser l'amélioration du parcours décisionnel plutôt que d'ajouter davantage de graphiques ou de fonctionnalités.