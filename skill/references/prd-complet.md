# PRD — Système intelligent de pilotage, d'anticipation et d'aide à la décision pour PME

**Version :** 1.1
**Statut :** Concept produit / cadrage MVP
**Marché initial :** Québec / Canada
**Client cible :** travailleurs autonomes, microentreprises et PME de 1 à 50 employés
**Modèle :** SaaS + services d'accompagnement + réseau d'experts

---

## Journal des modifications (v1.0 → v1.1)

* **Module 2 (ingestion des données) entièrement retravaillé** : le système accepte désormais un large éventail de formats de fichiers (tableurs, PDF, images de factures via OCR, courriels, exports bancaires, archives ZIP, JSON/XML), avec un pipeline d'ingestion universelle, un assistant de mappage intelligent, et une gestion explicite des cas particuliers (doublons, devises, fichiers corrompus).
* **Ajout de contrôles de qualité à l'ingestion** (section 9.3) : score de qualité par import, quarantaine des données douteuses avant fusion dans le modèle commun.
* **Section Sécurité renforcée** avec la conformité à la Loi 25 (Québec) et la résidence des données au Canada.
* **Modèle de données minimal enrichi** d'une entité *Import* pour tracer chaque fichier importé.
* **KPI produit enrichis** d'indicateurs sur la qualité et le succès des imports.
* **Disponibilité des formats de fichiers phasée explicitement** dans le MVP et la Roadmap, pour éviter la surcharge du MVP.
* **Nouvelles sections ajoutées** : Hors périmètre explicite (50), Hypothèses et contraintes (51), Risques produits et mitigation (52), Glossaire (53).

---

# 1. Vision du produit

## 1.1 Problème

Une petite entreprise doit souvent fonctionner sans :

* directeur financier;
* analyste de données;
* directeur des opérations;
* responsable marketing;
* analyste stratégique;
* spécialiste en automatisation;
* équipe de veille stratégique.

Le propriétaire doit donc simultanément :

* vendre;
* gérer les clients;
* suivre les finances;
* administrer l'entreprise;
* gérer les opérations;
* surveiller les employés;
* faire du marketing;
* analyser les performances;
* prendre les décisions stratégiques.

Les données existent généralement déjà, mais elles sont dispersées entre :

* Excel;
* logiciels comptables;
* POS;
* banques;
* CRM;
* Shopify;
* courriels;
* plateformes publicitaires;
* calendriers;
* fichiers;
* systèmes internes.

Le propriétaire possède donc beaucoup d'informations mais manque de temps et de capacité analytique pour les transformer en décisions.

---

# 2. Solution

Créer un **système intelligent de pilotage PME** capable de :

1. connecter les données internes;
2. surveiller les données externes;
3. comprendre le fonctionnement de l'entreprise;
4. analyser automatiquement les performances;
5. détecter les anomalies;
6. détecter les risques;
7. détecter les opportunités;
8. expliquer les causes;
9. recommander des actions;
10. automatiser certaines actions;
11. suivre les résultats;
12. générer automatiquement des rapports;
13. alerter le propriétaire lorsque son intervention est nécessaire;
14. orienter vers un expert humain lorsque la situation dépasse les capacités du système.

---

# 3. Proposition de valeur

## Promesse principale

> **Comprendre votre entreprise, anticiper ce qui arrive et savoir quoi faire — sans avoir à construire une équipe complète d'analystes et de spécialistes.**

## Promesse fonctionnelle

Le système transforme :

**Données → Information → Analyse → Risque/Opportunité → Décision → Action → Résultat**

---

# 4. Positionnement

Le produit n'est pas :

* simplement un logiciel comptable;
* simplement un dashboard;
* simplement un CRM;
* simplement un outil d'IA;
* simplement un ERP;
* simplement un outil de veille.

Il constitue une nouvelle couche de **pilotage intelligent** au-dessus des systèmes existants.

## Catégorie

> **Système intelligent de pilotage et d'anticipation pour PME**

---

# 5. Utilisateurs

## 5.1 Utilisateur principal

### Propriétaire / dirigeant

Besoins :

* comprendre rapidement l'entreprise;
* détecter les problèmes;
* savoir quoi prioriser;
* gagner du temps;
* réduire les tâches administratives;
* identifier les opportunités;
* prendre de meilleures décisions.

---

## 5.2 Utilisateurs secondaires

### Gestionnaire

Besoin :

* suivre les opérations;
* gérer les KPI;
* suivre les équipes;
* recevoir les alertes.

### Comptable

Besoin :

* accéder aux données;
* vérifier les analyses;
* préparer certaines informations financières.

### Conseiller / consultant

Besoin :

* analyser plusieurs entreprises;
* produire des rapports;
* suivre les recommandations.

### Expert partenaire

Exemples :

* comptable;
* fiscaliste;
* avocat;
* consultant;
* spécialiste marketing;
* spécialiste RH;
* expert automatisation.

---

# 6. Architecture fonctionnelle

```text
                         UTILISATEUR
                             │
                             ▼
                    ┌─────────────────┐
                    │   INTERFACE PME │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          PILOTAGE        ASSISTANT       RAPPORTS
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    MOTEUR D'INTELLIGENCE
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
       ANALYSE            RISQUES          OPPORTUNITÉS
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                     MOTEUR DE DÉCISION
                             │
                             ▼
                    RECOMMANDATIONS
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              AUTOMATISATION      HUMAIN
                    │                 │
                    └────────┬────────┘
                             ▼
                         RÉSULTAT
                             │
                             ▼
                       APPRENTISSAGE
```

---

# 7. Module 1 — Configuration de l'entreprise

Lors de l'inscription, le système construit le profil de l'entreprise.

## Informations

* nom;
* secteur;
* localisation;
* nombre d'employés;
* modèle d'affaires;
* produits;
* services;
* clientèle;
* fournisseurs;
* objectifs;
* chiffre d'affaires;
* outils utilisés.

## Objectifs

Le propriétaire peut choisir :

* augmenter les ventes;
* améliorer la rentabilité;
* réduire les coûts;
* améliorer la trésorerie;
* automatiser;
* développer un marché;
* réduire les risques;
* améliorer la productivité;
* préparer une croissance.

Ces objectifs influencent les recommandations du système.

---

# 8. Module 2 — Ingestion et connexion des données (multi-format)

## 8.1 Principe directeur

Le système doit accepter les données d'une PME **telles qu'elles existent réellement**, sans forcer le propriétaire à les reformater avant de les envoyer. La majorité des PME conservent leurs informations dans des formats hétérogènes (tableur, PDF, photo de facture prise au téléphone, courriel, extrait bancaire). Le moteur d'ingestion doit donc être conçu comme une **couche universelle de lecture**, indépendante du format d'origine, qui alimente ensuite le modèle de données commun (Module 3).

## 8.2 Types de fichiers supportés (Niveau 1 — import manuel)

| Catégorie | Formats | Exemples d'usage | Méthode d'extraction |
|---|---|---|---|
| Tableurs | XLSX, XLS, CSV, TSV, ODS, lien Google Sheets | Registre de ventes, grand livre, liste de clients | Parsing structuré (colonnes/lignes) |
| Documents texte | PDF (texte natif), DOCX, TXT, RTF | Contrats, relevés, ententes fournisseurs | Extraction de texte et de tableaux |
| PDF/images scannés | PDF scanné, JPG, PNG, HEIC, WEBP | Factures et reçus papier ou photographiés | OCR + extraction de champs (date, montant, fournisseur, taxes) |
| Courriels | .eml, .msg, ou transfert vers une adresse d'ingestion dédiée | Confirmations de commande, relances, pièces jointes | Parsing MIME + extraction des pièces jointes |
| Données bancaires/comptables | OFX, QFX, QIF, QBO | Relevés bancaires, exports comptables | Parsing de formats financiers standards |
| Archives | ZIP | Lot de plusieurs factures ou documents | Décompression puis traitement individuel de chaque fichier |
| Données structurées brutes | JSON, XML | Export d'un système interne ou d'une plateforme tierce | Parsing structuré direct |

Ce tableau n'est pas figé : l'architecture doit permettre d'ajouter un nouveau type de fichier sans repenser le pipeline (voir 8.3).

## 8.3 Pipeline d'ingestion universelle

```text
FICHIER REÇU
     │
     ▼
DÉTECTION DU TYPE DE FICHIER
     │
     ├──────────────┬──────────────┬──────────────┬──────────────┐
     ▼              ▼              ▼              ▼              ▼
  TABLEUR         PDF/DOCX        IMAGE        COURRIEL        ARCHIVE
 (parsing        (extraction     (OCR +        (parsing MIME  (décompression
  structuré)      texte/table)    extraction     + pièces       + traitement
                                   de champs)     jointes)       individuel)
     └──────────────┴──────────────┴──────────────┴──────────────┘
                             │
                             ▼
                 EXTRACTION DES CHAMPS BRUTS
                             │
                             ▼
              VALIDATION & DÉTECTION D'ERREURS
                             │
                             ▼
          ASSISTANT DE MAPPAGE (association aux entités
                du modèle de données PME)
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              QUARANTAINE      NORMALISATION
           (qualité insuffisante)   (Module 3)
```

## 8.4 Assistant de mappage intelligent

Lors d'un premier import d'une source inconnue (ex. un tableur avec des noms de colonnes non standards), le système propose automatiquement une correspondance entre les colonnes du fichier et les entités du modèle commun (client, transaction, date, montant, catégorie, etc.), à partir du nom des colonnes et du contenu observé.

* Le propriétaire valide ou corrige ce mappage une seule fois.
* Le mappage est ensuite mémorisé comme **gabarit réutilisable** pour cette source (ex. « export mensuel de mon logiciel comptable »), rendant les imports suivants automatiques.

## 8.5 OCR et extraction de documents non structurés

Pour les PDF scannés et les images (factures, reçus photographiés) :

* extraction automatique des champs clés (date, fournisseur, numéro de facture, montant, taxes);
* **score de confiance par champ extrait**, affiché à l'utilisateur;
* tout champ sous le seuil de confiance est signalé pour validation humaine avant d'être intégré aux analyses (voir 9.3).

## 8.6 Gestion des cas particuliers

* **Fichiers corrompus ou illisibles** → message clair à l'utilisateur avec suggestion de re-export.
* **Fichiers multi-onglets** (ex. classeur Excel avec plusieurs feuilles de structures différentes) → détection et traitement onglet par onglet.
* **Données multilingues** (français/anglais) → détection de la langue et normalisation des libellés (ex. « Revenue » = « Revenu »).
* **Doublons** (même fichier réimporté, ou chevauchement avec un import précédent) → détection et dé-duplication automatique.
* **Devises multiples** → conversion normalisée avec taux de change horodaté.
* **Fichiers volumineux** → traitement asynchrone avec barre de progression et notification à la fin.

## 8.7 Sécurité et gouvernance de l'import

* chaque fichier importé est horodaté, associé à l'utilisateur qui l'a téléversé, et conservé dans un journal d'audit (source → donnée);
* un import (et toutes les données qui en découlent) peut être annulé/supprimé intégralement;
* aucun fichier ou contenu d'une entreprise n'est utilisé pour entraîner un modèle partagé entre entreprises (voir aussi section 43).

## 8.8 Disponibilité progressive par phase

Pour éviter de surcharger le MVP, la prise en charge des formats est explicitement phasée :

* **MVP (Phase 1)** : CSV, XLSX, XLS, TSV, PDF texte natif.
* **Phase 2** : images/PDF scannés (OCR), courriels, archives ZIP, exports bancaires (OFX/QFX/QIF).
* **Phase 3** : exports comptables spécialisés (QBO, Acomba), connecteurs API directs (Niveau 2/3 ci-dessous), intégrations élargies.

## 8.9 Niveau 2 — Connexions directes

Exemples :

* Excel (fichier synchronisé);
* Google Sheets;
* Shopify;
* Stripe;
* Square;
* Lightspeed;
* QuickBooks;
* Acomba;
* CRM;
* plateformes publicitaires;
* Gmail;
* Outlook.

## 8.10 Niveau 3 — API

Architecture permettant d'ajouter progressivement de nouvelles intégrations, sans dépendre d'un import manuel récurrent.

---

# 9. Module 3 — Normalisation et qualité des données

## 9.1 Transformation vers un modèle commun

Les données provenant de différentes sources doivent être transformées dans un modèle commun.

Exemple :

```text
SHOPIFY
POS
EXCEL
COMPTABILITÉ
CRM
      ↓
NORMALISATION
      ↓
MODÈLE DE DONNÉES PME
```

## 9.2 Entités principales

* entreprise;
* client;
* fournisseur;
* produit;
* service;
* transaction;
* facture;
* paiement;
* dépense;
* employé;
* commande;
* campagne;
* tâche;
* événement;
* KPI.

## 9.3 Contrôles de qualité à l'ingestion

Avant qu'une donnée importée soit fusionnée dans le modèle commun, elle traverse une étape de validation automatique :

* **vérification des types** : dates valides, montants numériques, devises reconnues, identifiants non dupliqués;
* **détection des valeurs manquantes critiques** (ex. une transaction sans montant);
* **détection des incohérences** (ex. date de transaction future, montant négatif inattendu sur une vente);
* **détection des doublons** entre le nouvel import et les données déjà présentes;
* **score de qualité par import**, affiché au propriétaire, par exemple :

> *94 % des lignes importées avec succès. 6 % nécessitent une validation manuelle (3 dates ambiguës, 2 montants illisibles).*

Les lignes sous le seuil de confiance sont placées en **quarantaine** : visibles et corrigibles par l'utilisateur, mais exclues des calculs de KPI et des analyses tant qu'elles ne sont pas validées ou rejetées. Ce principe évite qu'une donnée mal extraite (ex. OCR imparfait) fausse silencieusement un tableau de bord.

---

# 10. Module 4 — Tableau de bord de santé

Écran principal :

# Comment va mon entreprise ?

Score global :

**78 / 100**

## Dimensions

* Finance;
* ventes;
* trésorerie;
* clients;
* opérations;
* marketing;
* productivité;
* risques;
* croissance.

Chaque dimension reçoit :

* score;
* tendance;
* niveau de confiance;
* évolution;
* explication.

---

# 11. Module 5 — KPI

Le système sélectionne automatiquement les KPI pertinents selon le secteur.

## Finance

* chiffre d'affaires;
* marge brute;
* marge nette;
* dépenses;
* bénéfice;
* trésorerie;
* comptes clients;
* comptes fournisseurs.

## Ventes

* volume;
* conversion;
* panier moyen;
* nouveaux clients;
* rétention;
* revenus par produit;
* revenus par client.

## Opérations

* délais;
* commandes;
* productivité;
* utilisation des ressources;
* coûts opérationnels.

## Marketing

* dépenses;
* leads;
* conversions;
* coût d'acquisition;
* ROI;
* revenus par campagne.

---

# 12. Module 6 — Analyse intelligente

Le moteur doit répondre à :

### Qu'est-ce qui s'est passé ?

### Pourquoi ?

### Quel est l'impact ?

### Est-ce normal ?

### Que devrait-on faire ?

Exemple :

> Les ventes ont augmenté de 12 %, mais la marge a diminué de 4 %.

Le système cherche les causes :

* coût fournisseur;
* prix;
* mix produit;
* promotions;
* publicité;
* frais de livraison.

Puis présente :

> **Cause probable : augmentation du coût du fournisseur X.**

---

# 13. Module 7 — Détection d'anomalies

Le système compare :

* historique;
* saisonnalité;
* moyenne;
* objectifs;
* tendances.

Exemples :

> Les dépenses publicitaires sont 32 % supérieures à la normale.

> Les ventes du produit X sont 25 % inférieures à la moyenne des quatre dernières semaines.

> Une facture inhabituelle de 4 200 $ a été détectée.

---

# 14. Module 8 — Radar externe

C'est une composante stratégique majeure.

Le système surveille l'environnement de l'entreprise.

## Sources potentielles

### Gouvernement

* lois;
* règlements;
* programmes;
* subventions;
* changements fiscaux.

### Économie

* inflation;
* taux d'intérêt;
* chômage;
* taux de change;
* prix des matières premières.

### Marché

* tendances;
* demande;
* nouvelles technologies;
* nouveaux modèles commerciaux.

### Concurrence

* prix;
* produits;
* promotions;
* nouveaux concurrents;
* ouvertures;
* expansions;
* recrutements;
* avis.

### Fournisseurs

* changements de prix;
* ruptures;
* délais;
* nouveaux fournisseurs.

### Consommateurs

* tendances de recherche;
* réseaux sociaux;
* avis;
* comportements.

### Actualités

* nouvelles sectorielles;
* événements économiques;
* événements réglementaires.

---

# 15. Moteur de pertinence

Le système ne doit pas simplement collecter des nouvelles.

Il doit déterminer :

> **Cette information est-elle pertinente pour cette entreprise ?**

Pipeline :

```text
SOURCE
  ↓
INFORMATION
  ↓
EXTRACTION DU SIGNAL
  ↓
SECTEUR
  ↓
LOCALISATION
  ↓
ENTREPRISE
  ↓
IMPACT POTENTIEL
  ↓
SCORE DE PERTINENCE
```

---

# 16. Score de risque

Chaque risque reçoit :

* probabilité;
* impact;
* urgence;
* confiance;
* horizon temporel.

Exemple :

```text
RISQUE

Hausse du coût fournisseur

Probabilité : 78 %
Impact : élevé
Urgence : moyenne
Confiance : élevée

Score global : 82/100
```

---

# 17. Score d'opportunité

Même logique :

```text
OPPORTUNITÉ

Nouveau segment de marché

Potentiel : élevé
Probabilité : 71 %
Horizon : 3-6 mois
Confiance : moyenne

Score : 76/100
```

---

# 18. Module de signaux faibles

Le système doit pouvoir combiner plusieurs événements.

Exemple :

```text
Signal 1
↑ recherches consommateurs

+

Signal 2
↑ nouveaux produits concurrents

+

Signal 3
↑ investissements dans le secteur

+

Signal 4
nouvelle technologie

        ↓

SIGNAL FAIBLE

        ↓

OPPORTUNITÉ POTENTIELLE
```

Le système ne prétend pas prédire l'avenir.

Il identifie :

> **des changements suffisamment importants pour mériter l'attention du propriétaire.**

---

# 19. Module de recommandations

Chaque risque ou opportunité doit produire une recommandation.

Format :

### Situation

Que se passe-t-il ?

### Analyse

Pourquoi ?

### Impact

Quel pourrait être l'effet ?

### Action

Que faire ?

### Priorité

* faible;
* moyenne;
* élevée;
* urgente.

---

# 20. Module d'action

Une recommandation peut devenir une tâche.

Exemple :

> Vérifier les prix des fournisseurs.

Le système crée :

**Tâche**

* responsable;
* date limite;
* priorité;
* statut.

---

# 21. Automatisation

Le système peut exécuter certaines actions après autorisation.

Exemples :

* générer un courriel;
* relancer un client;
* produire un rapport;
* créer une tâche;
* générer une facture;
* préparer une publication;
* classer un document;
* synchroniser des données.

Les actions sensibles nécessitent une validation humaine.

---

# 22. Assistant conversationnel

L'utilisateur peut poser :

> « Pourquoi mes bénéfices baissent-ils ? »

> « Quels sont mes trois plus gros risques ? »

> « Quel client est le plus rentable ? »

> « Où puis-je réduire mes dépenses ? »

> « Que dois-je faire cette semaine ? »

> « Que s'est-il passé depuis lundi ? »

> « Quelles opportunités as-tu trouvées ? »

L'IA répond uniquement à partir des données disponibles et indique les sources utilisées.

---

# 23. Rapport quotidien

Génération automatique.

## Contenu

### Résumé

* état général;
* évolution;
* événements importants.

### Performance

* ventes;
* finance;
* opérations.

### Risques

Top risques.

### Opportunités

Top opportunités.

### Actualités pertinentes

Événements externes liés à l'entreprise.

### Actions

Top 3 à 5 actions.

### Automatisations

Actions pouvant être exécutées automatiquement.

---

# 24. Rapport hebdomadaire

Le rapport compare :

* semaine actuelle;
* semaine précédente;
* tendance historique.

Contenu :

* performance;
* KPI;
* anomalies;
* risques;
* opportunités;
* marché;
* concurrence;
* actions réalisées;
* actions restantes;
* recommandations.

---

# 25. Rapport mensuel

Analyse approfondie :

* résultats financiers;
* ventes;
* clients;
* marketing;
* opérations;
* trésorerie;
* productivité;
* risques;
* opportunités;
* évolution externe;
* recommandations.

Le système doit produire un **résumé exécutif automatique**.

---

# 26. Rapport semestriel

Analyse stratégique sur six mois.

## Contenu

* évolution de l'entreprise;
* tendances;
* rentabilité;
* clients;
* marché;
* concurrence;
* risques;
* opportunités;
* actions ayant fonctionné;
* actions ayant échoué;
* prévisions;
* priorités des six prochains mois.

---

# 27. Rapport annuel

Le rapport annuel constitue une synthèse complète.

## Sections

1. Résumé exécutif
2. Performance financière
3. Performance commerciale
4. Clients
5. Marketing
6. Opérations
7. Productivité
8. Ressources
9. Risques
10. Opportunités
11. Marché
12. Concurrence
13. Évolution de l'entreprise
14. Prévisions
15. Recommandations
16. Plan stratégique de l'année suivante

---

# 28. Mémoire décisionnelle

Le système conserve les décisions.

Exemple :

| Décision            | Date  | Résultat   |
| ------------------- | ----- | ---------- |
| Augmentation prix   | 01/08 | Marge +6 % |
| Nouveau fournisseur | 15/07 | Coût -8 %  |
| Campagne X          | 20/07 | ROI +12 %  |

Cela permet au système de savoir :

* quelles décisions ont fonctionné;
* lesquelles ont échoué;
* quelles stratégies sont efficaces.

---

# 29. Boucle d'apprentissage

```text
DÉTECTION
    ↓
ANALYSE
    ↓
RECOMMANDATION
    ↓
DÉCISION
    ↓
ACTION
    ↓
RÉSULTAT
    ↓
MESURE
    ↓
APPRENTISSAGE
```

Le système devient progressivement plus personnalisé.

---

# 30. Centre de tâches

Toutes les recommandations peuvent être transformées en tâches.

Catégories :

* urgent;
* financier;
* commercial;
* marketing;
* opérationnel;
* administratif;
* stratégique.

Le système doit prioriser automatiquement.

---

# 31. Centre d'alertes

Types :

### 🔴 Critique

Intervention immédiate recommandée.

### 🟠 Important

Intervention prochaine.

### 🟡 Surveillance

Évolution à surveiller.

### 🟢 Opportunité

Possibilité intéressante.

### 🔵 Information

Information pertinente mais sans action immédiate.

---

# 32. Notifications

Canaux possibles :

* application;
* courriel;
* notification mobile;
* SMS;
* éventuellement Teams/Slack.

L'utilisateur choisit ses préférences.

---

# 33. Contrôle humain

Le système doit respecter le principe :

> **Automatiser ce qui est répétitif, assister ce qui est décisionnel, laisser l'humain décider lorsqu'un risque important existe.**

Actions nécessitant généralement confirmation :

* paiement;
* modification importante de prix;
* suppression de données;
* décision RH;
* action juridique;
* engagement financier;
* communication sensible.

---

# 34. Niveau de confiance

Chaque analyse IA doit afficher :

**Confiance : élevée / moyenne / faible**

et, lorsque pertinent :

**Sources utilisées**

Cela permet au propriétaire de comprendre la fiabilité de la recommandation.

---

# 35. Architecture technique cible

```text
                  SOURCES
                     │
       ┌─────────────┼──────────────┐
       ▼             ▼              ▼
     API          FICHIERS       WEB/DONNÉES
       │             │              │
       └─────────────┼──────────────┘
                     ▼
              DATA INGESTION
                     ▼
             NORMALISATION
                     ▼
                DATA STORE
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
      KPI         ANALYTICS    RADAR EXTERNE
        │            │            │
        └────────────┼────────────┘
                     ▼
               MOTEUR IA
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       RISQUES   OPPORTUNITÉS   ANOMALIES
          │          │          │
          └──────────┼──────────┘
                     ▼
             MOTEUR DE DÉCISION
                     ▼
              RECOMMANDATIONS
                     ▼
             AUTOMATISATIONS
                     ▼
                  RAPPORTS
```

---

# 36. Modèle de données minimal

## Company

* company_id
* sector
* location
* employees
* revenue_range
* objectives

## Customer

* customer_id
* company_id
* revenue
* acquisition_date
* status

## Transaction

* transaction_id
* date
* amount
* category
* customer_id

## Expense

* expense_id
* date
* supplier
* amount
* category

## KPI

* kpi_id
* name
* value
* period
* target
* trend

## ExternalSignal

* signal_id
* source
* date
* category
* relevance
* confidence
* impact

## Risk

* risk_id
* description
* probability
* impact
* urgency
* status

## Opportunity

* opportunity_id
* description
* potential
* probability
* horizon
* status

## Recommendation

* recommendation_id
* type
* priority
* action
* status

## Report

* report_id
* type
* period
* generated_at
* summary

## Import

*(nouvelle entité — traçabilité de l'ingestion, voir section 8.7)*

* import_id
* company_id
* source_type (ex. xlsx, pdf, image, email, api)
* file_name
* uploaded_by
* uploaded_at
* status (en cours, complété, en quarantaine, échoué)
* quality_score
* rows_processed
* rows_quarantined

---

# 37. MVP

Il ne faut surtout pas construire tout le système immédiatement.

## MVP recommandé

### Fonctionnalités obligatoires

1. création de l'entreprise;
2. import Excel/CSV/PDF texte (voir 8.8);
3. modèle de données;
4. dashboard;
5. KPI;
6. analyse IA;
7. détection d'anomalies;
8. recommandations;
9. radar externe limité;
10. détection de risques/opportunités;
11. rapport quotidien;
12. rapport hebdomadaire;
13. rapport mensuel;
14. assistant IA;
15. centre d'alertes.

### Note sur les formats de fichiers au MVP

Pour rester réaliste, le MVP ne supporte que les formats les plus courants et les moins coûteux à traiter : CSV, XLSX, XLS, TSV et PDF texte natif. L'OCR (images, PDF scannés), les courriels et les exports bancaires spécialisés sont ajoutés en Phase 2 (voir Roadmap, section 40).

---

# 38. Ce qui doit être reporté après le MVP

Ne pas commencer par :

* ERP complet;
* paie;
* comptabilité complète;
* gestion RH complète;
* POS propriétaire;
* CRM propriétaire;
* application mobile complexe;
* marketplace d'experts;
* centaines d'intégrations.

Le produit doit d'abord démontrer :

> **« Je prends les données existantes d'une PME et je lui donne une meilleure compréhension de son entreprise et de son environnement. »**

---

# 39. MVP technique simplifié

Pour un premier prototype :

### Frontend

* React / Next.js

### Backend

* Python / FastAPI

### Base de données

* PostgreSQL

### Ingestion de fichiers

* parsing tableurs : pandas / openpyxl;
* extraction PDF texte : pdfplumber ou équivalent;
* OCR (Phase 2) : Tesseract ou service infonuagique d'OCR;
* parsing courriels (Phase 2) : bibliothèque email/mailparser.

### Analyse

* Python;
* pandas;
* calculs KPI.

### IA

* modèle LLM;
* système de prompts structurés;
* RAG pour les documents et sources.

### Automatisation

* n8n ou équivalent.

### Visualisation

* bibliothèque de graphiques web.

### Authentification

* système sécurisé avec gestion des organisations.

---

# 40. Roadmap

## Phase 0 — Validation

Objectif :

**10 à 20 PME pilotes**

Faire manuellement :

* collecte;
* analyse;
* diagnostic;
* rapport.

Objectif : identifier les problèmes les plus fréquents.

---

## Phase 1 — MVP

Construire :

* import de données (CSV, XLSX, XLS, TSV, PDF texte);
* dashboard;
* KPI;
* IA;
* alertes;
* radar externe;
* rapports.

---

## Phase 2 — Automatisation

Ajouter :

* ingestion élargie (OCR pour images et PDF scannés, courriels, exports bancaires OFX/QFX/QIF, archives ZIP);
* intégrations;
* workflows;
* automatisations;
* notifications.

---

## Phase 3 — Intelligence avancée

Ajouter :

* prévisions;
* benchmarking;
* détection de signaux faibles;
* analyse concurrentielle;
* scénarios;
* exports comptables spécialisés (QBO, Acomba) et connecteurs API additionnels.

---

## Phase 4 — Écosystème

Ajouter :

* experts;
* comptables;
* consultants;
* partenaires;
* marketplace;
* services professionnels.

---

# 41. Modèle économique

## Offre Starter

Pour travailleurs autonomes / microentreprises.

Comprend :

* dashboard;
* KPI;
* rapports;
* assistant IA;
* alertes limitées.

---

## Offre Growth

Pour PME.

Comprend :

* toutes les fonctions Starter;
* radar externe;
* analyse avancée;
* automatisations;
* intégrations;
* recommandations personnalisées.

---

## Offre Pro

Pour entreprises plus structurées.

Comprend :

* multi-utilisateurs;
* automatisations avancées;
* rapports personnalisés;
* benchmarking;
* plusieurs sources;
* accompagnement.

---

# 42. Services complémentaires

Le SaaS peut être accompagné de :

* implantation;
* nettoyage de données;
* automatisation;
* intégration;
* optimisation des processus;
* formation;
* accompagnement stratégique.

Cela permet de générer des revenus avant même que le SaaS soit entièrement automatisé.

---

# 43. Sécurité

Les données d'entreprise sont sensibles.

Le produit doit prévoir :

* chiffrement;
* contrôle d'accès;
* authentification forte;
* séparation des organisations;
* journalisation;
* sauvegardes;
* gestion des permissions;
* suppression des données;
* politique de confidentialité;
* conformité à la **Loi 25** sur la protection des renseignements personnels dans le secteur privé (Québec) et, le cas échéant, à la LPRPDE (fédérale);
* résidence des données au Canada (hébergement infonuagique dans une région canadienne);
* traçabilité complète de chaque fichier importé — qui, quand, quel contenu (voir section 8.7);
* droit du propriétaire à l'accès, la rectification et la suppression de ses données, incluant les fichiers sources téléversés.

L'IA ne doit pas exposer les données d'une entreprise à une autre.

---

# 44. Principes de confiance

Le système doit toujours distinguer :

### FAIT

Information provenant d'une source ou donnée interne.

### ANALYSE

Interprétation du système.

### HYPOTHÈSE

Possibilité non confirmée.

### RECOMMANDATION

Action suggérée.

### PRÉVISION

Projection basée sur les données disponibles.

Cette distinction est fondamentale pour éviter de présenter une hypothèse comme une certitude.

---

# 45. KPI du produit

## Activation

* entreprise créée;
* données importées;
* premier diagnostic;
* premier rapport généré.

## Qualité de l'ingestion

* % de fichiers importés avec succès dès le premier essai;
* temps moyen entre le téléversement d'un fichier et sa disponibilité dans le dashboard;
* score de qualité moyen des imports;
* % de lignes nécessitant une validation manuelle (quarantaine).

## Engagement

* rapports consultés;
* alertes consultées;
* questions IA;
* recommandations suivies.

## Valeur

* problèmes détectés;
* opportunités détectées;
* heures économisées;
* automatisations exécutées;
* actions complétées.

## Business

* MRR;
* CAC;
* churn;
* LTV;
* conversion;
* rétention.

---

# 46. KPI ultime

Le produit ne devrait pas se vanter du nombre de fonctionnalités.

Le KPI fondamental doit être :

> **Valeur générée pour le propriétaire.**

Exemples :

* 6 heures économisées;
* 2 400 $ de coûts évités;
* 4 000 $ d'opportunités identifiées;
* 3 risques importants détectés;
* 2 processus automatisés.

---

# 47. Expérience utilisateur idéale

Le propriétaire se connecte.

Il ne voit pas 50 graphiques.

Il voit :

# Bonjour.

## Voici ce qui mérite votre attention aujourd'hui.

### 🔴 1 problème

Votre marge baisse depuis trois semaines.

### 🟠 2 risques

Une hausse de coût fournisseur est détectée.

Un concurrent vient de modifier ses prix.

### 🟢 2 opportunités

Nouvelle demande détectée dans votre marché.

Programme gouvernemental potentiellement pertinent.

### 🎯 Vos 3 priorités

1. Vérifier le fournisseur X.
2. Analyser le prix du produit Y.
3. Examiner le programme Z.

### 📊 Santé de l'entreprise

**78 / 100**

> **Aucune autre intervention importante n'est nécessaire aujourd'hui.**

---

# 48. Vision finale

À terme, le système doit devenir le **centre nerveux de gestion de la PME**.

```text
                    PME
                     │
                     ▼
            ┌─────────────────┐
            │   COPILOTE PME  │
            └────────┬────────┘
                     │
       ┌─────────────┼──────────────┐
       ▼             ▼              ▼
   ENTREPRISE      MARCHÉ        CONCURRENTS
       │             │              │
       └─────────────┼──────────────┘
                     ▼
               INTELLIGENCE
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
    RISQUES     OPPORTUNITÉS     TENDANCES
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                  DÉCISION
                     │
                     ▼
                   ACTION
                     │
                     ▼
                AUTOMATISATION
                     │
                     ▼
                  RÉSULTAT
                     │
                     ▼
                APPRENTISSAGE
```

# 49. Définition finale du produit

> **Un système intelligent de pilotage pour PME qui collecte automatiquement les données internes et externes, surveille l'environnement de l'entreprise, détecte les anomalies, risques et opportunités, explique leur impact, recommande les actions prioritaires, automatise les tâches pertinentes et génère automatiquement des rapports de gestion quotidiens, hebdomadaires, mensuels, semestriels et annuels.**

La vision n'est donc pas de créer **un autre logiciel que le propriétaire doit apprendre à utiliser**.

La vision est de créer un système qui **travaille pour le propriétaire**.

Le propriétaire doit principalement répondre à trois questions :

> **Qu'est-ce qui se passe ?**

> **Qu'est-ce qui risque d'arriver ?**

> **Qu'est-ce que je devrais faire ?**

Le système se charge du reste autant que possible.

---

# 50. Hors périmètre explicite (MVP et phases rapprochées)

Pour éviter la dilution du produit, les éléments suivants sont explicitement exclus du MVP et des premières phases :

* reconnaissance de l'écriture manuscrite non structurée (OCR manuscrit);
* formats de fichiers propriétaires ou exotiques non listés à la section 8.2;
* intégrations comptables propres à des écosystèmes hors Amérique du Nord;
* gestion multi-devise avancée (comptabilité de couverture, conversion en temps réel sur les marchés financiers);
* application mobile native (le produit est web-first, conçu de façon responsive);
* ERP complet, module de paie, POS ou CRM propriétaires (voir aussi section 38).

---

# 51. Hypothèses et contraintes

## Hypothèses

* les PME pilotes disposent d'un minimum de données numérisées (Excel, POS ou logiciel comptable) — le produit ne vise pas, dans un premier temps, les entreprises opérant entièrement sur papier;
* le propriétaire est prêt à accorder un accès, même partiel, à ses données financières et opérationnelles en échange d'une valeur perçue rapide;
* les PME pilotes acceptent un accompagnement humain initial (Phase 0) pour valider le concept avant l'automatisation complète.

## Contraintes

* hébergement des données au Canada, exigence fréquente des PME et institutions québécoises;
* budget MVP limité — priorité donnée aux formats de fichiers les plus courants (Excel/CSV/PDF texte) avant l'investissement dans l'OCR et les connecteurs avancés;
* qualité des analyses directement dépendante de la qualité des données fournies par le client, d'où l'importance des contrôles de qualité (section 9.3).

---

# 52. Risques produits et mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Qualité des données sources très hétérogène | Analyses erronées, perte de confiance envers le système | Score de qualité par import + quarantaine avant fusion (section 9.3) |
| Sur-promesse sur l'extraction automatique (OCR, mappage) | Frustration si le taux d'erreur perçu est élevé | Niveau de confiance affiché par champ extrait + validation humaine obligatoire sous un seuil |
| Dépendance à un fournisseur LLM unique | Risque de coût ou de disponibilité | Architecture modulaire permettant de substituer le modèle IA |
| Réticence du propriétaire à partager ses données financières | Faible taux d'adoption | Transparence sur la sécurité (section 43) + mode démonstration avec données fictives avant engagement réel |
| Sous-estimation de l'effort d'ingestion multi-format | Retard du MVP | Disponibilité des formats phasée explicitement (sections 8.8, 37, 40) |

---

# 53. Glossaire

* **PME** : petite et moyenne entreprise.
* **KPI** : indicateur clé de performance.
* **OCR** : reconnaissance optique de caractères, technologie permettant d'extraire du texte à partir d'une image ou d'un document scanné.
* **RAG** : génération augmentée par récupération (*Retrieval-Augmented Generation*), technique permettant à un modèle de langage de s'appuyer sur des documents externes pour répondre.
* **MRR** : revenu récurrent mensuel (*Monthly Recurring Revenue*).
* **CAC** : coût d'acquisition client.
* **LTV** : valeur vie client (*Lifetime Value*).
* **Loi 25** : loi québécoise modernisant les règles de protection des renseignements personnels dans le secteur privé.
