# Charte de projet — Copilote PME

**Nom du projet :** Système intelligent de pilotage, d'anticipation et d'aide à la décision pour PME ("Copilote PME")
**ID projet :** COPILOTE-PME
**Préparé par :** [À définir]
**Date :** 2026-08-19
**Version :** 1.0 (basée sur PRD v1.1)

---

## Résumé exécutif

**Description en une phrase :**
Un SaaS qui connecte les données existantes d'une PME (fichiers, comptabilité, banques, CRM), les transforme automatiquement en diagnostic, en alertes et en recommandations d'action, pour donner à un propriétaire de PME la lucidité d'une équipe d'analystes qu'il n'a pas les moyens d'embaucher.

**Alignement stratégique :**
- Objectif d'affaires : valider un nouveau marché SaaS pour les travailleurs autonomes, microentreprises et PME de 1 à 50 employés au Québec/Canada.
- Priorité stratégique : Élevée — le produit est en phase de cadrage MVP, aucune ligne de code métier écrite à ce jour ; l'environnement de développement vient d'être configuré (Next.js + FastAPI + PostgreSQL).
- Portefeuille : projet unique (pas de portefeuille multi-projets à ce stade) — offre SaaS avec modèle Starter / Growth / Pro (section 41 du PRD).

---

## Définition du projet

### Problème et justification d'affaires

**Énoncé du problème :**
Un propriétaire de PME doit jouer seul les rôles de directeur financier, analyste de données, directeur des opérations, marketing et stratégie. Les données existent (Excel, logiciels comptables, POS, banques, CRM, Shopify, courriels, plateformes publicitaires) mais sont dispersées, et le propriétaire manque de temps et de capacité analytique pour les transformer en décisions.

**Justification d'affaires :**
- Impact stratégique : nouvelle catégorie — « système intelligent de pilotage et d'anticipation pour PME » — positionnée au-dessus des outils existants (comptabilité, dashboard, CRM, ERP), sans les remplacer.
- Bénéfices qualitatifs : gain de lucidité et de temps pour le propriétaire, réduction des tâches administratives, détection précoce de risques/opportunités.
- Risque de statu quo : le propriétaire continue de prendre des décisions à l'aveugle ou en retard, avec des données dispersées et sans capacité d'analyse.

**Valeur d'affaires attendue :**
- Bénéfices quantifiés : voir KPI produit (section 45 du PRD) — heures économisées, problèmes/opportunités détectés, automatisations exécutées.
- Bénéfices qualitatifs : confiance accrue du propriétaire dans ses décisions, réduction de la charge mentale.
- Mesure du succès : voir « KPI ultime » (section 46 du PRD) et section Critères de succès ci-dessous.

### Définition du périmètre

**Dans le périmètre (MVP — section 37 du PRD) :**
- Création de l'entreprise (Module 1 — configuration)
- Import de données : CSV, XLSX, XLS, TSV, PDF texte natif (Excel/comptable en priorité)
- Modèle de données commun (Company, Customer, Transaction, Expense, KPI, ExternalSignal, Risk, Opportunity, Recommendation, Report, Import)
- Dashboard de santé de l'entreprise
- KPI
- Analyse IA
- Détection d'anomalies
- Recommandations
- Radar externe limité
- Détection de risques/opportunités
- Rapports quotidien, hebdomadaire, mensuel
- Assistant IA conversationnel
- Centre d'alertes

**Hors périmètre explicite (section 50 du PRD) :**
- OCR d'écriture manuscrite non structurée
- Formats de fichiers propriétaires/exotiques non listés
- Intégrations comptables hors Amérique du Nord
- Gestion multi-devise avancée (comptabilité de couverture, conversion temps réel)
- Application mobile native — le produit est **web-first, responsive** (décision confirmée le 2026-08-19 : les maquettes design mobile existantes dans le repo — `Copilote PME Mobile.dc.html`, `ios-frame.jsx` — sont traitées comme exploration/référence visuelle, pas comme direction de build ; le MVP cible le web responsive)
- ERP complet, paie, POS ou CRM propriétaires
- OCR image/PDF scanné, courriels, exports bancaires OFX/QFX/QIF, archives ZIP → reportés en **Phase 2**
- Exports comptables spécialisés (QBO, Acomba), connecteurs API additionnels, prévisions, benchmarking, signaux faibles, analyse concurrentielle → reportés en **Phase 3**
- Marketplace d'experts, comptables, consultants, partenaires → reportés en **Phase 4**

**Livrables clés (MVP) :**
| Livrable | Description | Critère d'acceptation | Échéance |
|---|---|---|---|
| Environnement de développement | Scaffold Next.js + FastAPI + PostgreSQL | Repo initialisé, dépendances installées, README de démarrage | Complété (2026-08-19) |
| Module configuration entreprise | Création/paramétrage d'une entreprise (secteur, taille, objectifs) | Une entreprise peut être créée et modifiée de bout en bout | [À définir] |
| Pipeline d'ingestion MVP | Import CSV/XLSX/XLS/TSV/PDF texte avec mappage assisté | ≥1 fichier de chaque format supporté importé avec score de qualité affiché | [À définir] |
| Dashboard + KPI | Vue de santé de l'entreprise avec KPI clés | Dashboard alimenté par au moins un import réel | [À définir] |
| Moteur d'analyse IA (anomalies, risques, opportunités, recommandations) | Détection automatique + explication (FAIT/ANALYSE/HYPOTHÈSE/RECOMMANDATION) | Distinction affichée pour chaque insight (section 44) | [À définir] |
| Rapports automatiques | Rapport quotidien, hebdomadaire, mensuel | Génération automatique et consultable dans l'app | [À définir] |
| Assistant IA + centre d'alertes | Interaction conversationnelle + alertes actionnables | Assistant répond sur les données de l'entreprise connectée | [À définir] |

---

## Critères de succès

### Critères de succès primaires
1. **Activation :** une PME pilote peut créer son entreprise, importer ses données et obtenir un premier diagnostic + premier rapport généré (section 45).
2. **Qualité de l'ingestion :** % élevé de fichiers importés avec succès dès le premier essai, faible % de lignes en quarantaine (section 45, 9.3).
3. **Valeur perçue :** heures économisées et problèmes/opportunités détectés rapportés par les PME pilotes (Phase 0 puis MVP).

### KPI produit (section 45 du PRD)
| KPI | Baseline | Cible | Méthode de mesure | Fréquence |
|---|---|---|---|---|
| Entreprises créées / données importées / 1er diagnostic / 1er rapport | 0 | [À définir] | Instrumentation produit | Continu |
| % fichiers importés avec succès au 1er essai | [À définir] | [À définir] | Logs d'ingestion | Continu |
| Score de qualité moyen des imports | [À définir] | [À définir] | Pipeline de qualité (section 9.3) | Par import |
| % lignes en quarantaine | [À définir] | [À définir] | Pipeline de qualité | Par import |
| Rapports/alertes consultés, recommandations suivies | [À définir] | [À définir] | Instrumentation produit | Hebdomadaire |
| MRR, CAC, churn, LTV, conversion, rétention | 0 | [À définir] | Système de facturation | Mensuel |

### Quality Gates
- **Gate 1 — Phase 0 (Validation) :** 10 à 20 PME pilotes traitées manuellement, problèmes fréquents identifiés.
- **Gate 2 — Fin MVP (Phase 1) :** import + dashboard + KPI + IA + alertes + radar externe + rapports fonctionnels de bout en bout sur au moins une PME pilote réelle.
- **Gate 3 — Avant mise à l'échelle (Phase 2) :** score de qualité d'ingestion et taux de succès des imports au-dessus du seuil cible avant d'investir dans OCR/intégrations élargies.

---

## Organisation du projet et RACI

> Le projet est actuellement porté en solo/petite équipe. Le RACI ci-dessous est un squelette à compléter au fur et à mesure du recrutement/de l'accompagnement.

### Comité de pilotage
| Rôle | Nom | Responsabilités |
|---|---|---|
| Sponsor exécutif | [À définir] | Décisions finales, autorité budgétaire |
| Propriétaire produit | [À définir] | Exigences métier, validation utilisateur |
| Propriétaire technique | [À définir] | Architecture, conformité technique, risque technique |

### Équipe projet principale
| Rôle | Nom | RACI | Responsabilités |
|---|---|---|---|
| Chef de projet | [À définir] | A | Livraison globale, échéancier, risques |
| Product Owner | [À définir] | R | Backlog MVP (section 37), priorisation |
| Lead technique | [À définir] | R | Architecture Next.js/FastAPI/PostgreSQL, qualité du code |
| QA | [À définir] | R | Stratégie de test, gestion des défauts |
| Design produit | [À définir] | R | Expérience utilisateur (dashboard, assistant IA) |

### RACI — Décisions clés
| Décision / activité | Chef de projet | Product Owner | Lead technique | Sponsor |
|---|---|---|---|---|
| Approbation du périmètre MVP | A | R | C | I |
| Architecture technique (section 35) | A | C | R | I |
| Formats de fichiers supportés par phase (section 8.8) | A | R | C | I |
| Décision de mise en production | A | C | C | R |
| Changements de périmètre | A | R | C | R |

**Légende :** R = Responsable, A = Redevable (Accountable), C = Consulté, I = Informé

---

## Échéancier et jalons (Roadmap — section 40 du PRD)

### Échéancier haut niveau
| Phase | Objectif | Livrables clés | Dépendances |
|---|---|---|---|
| Phase 0 — Validation | 10 à 20 PME pilotes, collecte/analyse/diagnostic/rapport manuels | Identification des problèmes les plus fréquents | Accès aux données des PME pilotes |
| Phase 1 — MVP | Produit automatisé de base | Import (CSV/XLSX/XLS/TSV/PDF texte), dashboard, KPI, IA, alertes, radar externe limité, rapports | Résultats Phase 0 |
| Phase 2 — Automatisation | Élargir l'ingestion et automatiser | OCR images/PDF scannés, courriels, exports bancaires OFX/QFX/QIF, ZIP, intégrations, workflows, notifications | MVP stable et adopté |
| Phase 3 — Intelligence avancée | Différenciation analytique | Prévisions, benchmarking, signaux faibles, analyse concurrentielle, scénarios, QBO/Acomba, connecteurs API | Phase 2 en production |
| Phase 4 — Écosystème | Réseau de valeur | Experts, comptables, consultants, partenaires, marketplace, services professionnels | Base d'utilisateurs établie |

*Dates précises non fixées dans le PRD — à définir avec le comité de pilotage.*

### Contraintes et dépendances
**Contraintes :**
- Hébergement des données au Canada (exigence PME/institutions québécoises).
- Budget MVP limité — priorité aux formats courants (Excel/CSV/PDF texte) avant OCR et connecteurs avancés.
- Qualité des analyses dépendante de la qualité des données fournies par le client.

**Hypothèses :**
- Les PME pilotes disposent d'un minimum de données numérisées (pas d'entreprises 100 % papier au démarrage).
- Le propriétaire est prêt à donner un accès (même partiel) à ses données financières/opérationnelles.
- Les PME pilotes acceptent un accompagnement humain initial en Phase 0.

---

## Sécurité et conformité (section 43 du PRD)

- Chiffrement, contrôle d'accès, authentification forte, séparation stricte entre organisations (une entreprise ne doit jamais voir les données d'une autre, y compris via l'IA).
- Journalisation, sauvegardes, gestion des permissions, suppression des données sur demande.
- Conformité **Loi 25** (Québec) et, le cas échéant, **LPRPDE** (fédérale).
- Résidence des données au Canada (hébergement infonuagique en région canadienne).
- Traçabilité complète de chaque fichier importé (qui, quand, quel contenu — entité `Import`, section 8.7/36).
- Droit du propriétaire à l'accès, la rectification et la suppression, y compris des fichiers sources.

---

## Gestion des risques (section 52 du PRD)

| Risque | Impact | Mitigation |
|---|---|---|
| Qualité des données sources très hétérogène | Analyses erronées, perte de confiance | Score de qualité par import + quarantaine avant fusion (section 9.3) |
| Sur-promesse sur l'extraction automatique (OCR, mappage) | Frustration si taux d'erreur perçu élevé | Niveau de confiance affiché par champ extrait + validation humaine sous un seuil |
| Dépendance à un fournisseur LLM unique | Risque de coût/disponibilité | Architecture modulaire permettant de substituer le modèle IA |
| Réticence à partager des données financières | Faible adoption | Transparence sécurité (section 43) + mode démo avec données fictives |
| Sous-estimation de l'effort d'ingestion multi-format | Retard du MVP | Disponibilité des formats phasée explicitement (sections 8.8, 37, 40) |

---

## Gestion de la qualité

- **Principes de confiance (section 44) :** chaque insight affiché doit être étiqueté FAIT / ANALYSE / HYPOTHÈSE / RECOMMANDATION / PRÉVISION — ne jamais présenter une hypothèse comme une certitude.
- **Stratégie de test :** à définir avec le lead technique — couverture minimale attendue sur le pipeline d'ingestion et le moteur d'analyse IA, vu leur criticité pour la confiance utilisateur.
- **Gestion des défauts :** à définir (outil de suivi, classification de sévérité).

---

## Prochaines étapes

1. Compléter les champs [À définir] (noms, dates, budget) avec le porteur de projet.
2. Valider le périmètre MVP (section 37 du PRD) avec les premières PME pilotes de la Phase 0.
3. Direction produit confirmée : **web responsive** (Next.js), conforme à la section 50 du PRD. Les maquettes mobile existantes restent une référence visuelle à réadapter en composants web, pas un livrable natif iOS.
4. Démarrer le développement du Module 1 (configuration de l'entreprise) une fois la charte validée.

---

**Contrôle du document :**
- Basé sur : `PRD-Systeme-Pilotage-PME-v1.1 (1).md`
- Dernière mise à jour : 2026-08-19
- Prochaine révision : [À définir]
