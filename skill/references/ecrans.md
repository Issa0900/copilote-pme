# Écrans prioritaires — contenu détaillé

Neuf écrans, dans l'ordre où un utilisateur les rencontre. Chaque entrée donne l'objectif, l'utilisateur visé, le contenu tiré du PRD et les composants du système de design à mobiliser.

## 1. Configuration de l'entreprise (onboarding) — module 1

**Objectif** : construire le profil de l'entreprise à l'inscription.

**Utilisateur** : propriétaire/dirigeant.

**Contenu** : formulaire couvrant nom, secteur, localisation, nombre d'employés, modèle d'affaires, produits, services, clientèle, fournisseurs, chiffre d'affaires, outils déjà utilisés. Puis sélection des objectifs (un ou plusieurs) : augmenter les ventes, améliorer la rentabilité, réduire les coûts, améliorer la trésorerie, automatiser, développer un marché, réduire les risques, améliorer la productivité, préparer une croissance. Ces objectifs influencent ensuite les recommandations — le préciser à l'écran (une phrase, pas un tooltip caché).

**Composants** : formulaire multi-étapes sobre, pas de barre de progression décorative superflue ; les objectifs comme cartes à cocher plutôt qu'une liste déroulante, puisqu'ils orientent tout le reste du produit.

## 2. Import de données — module 2 (niveau 1, MVP)

**Objectif** : accepter les données telles qu'elles existent réellement, sans forcer un reformatage.

**Utilisateur** : propriétaire, comptable.

**Contenu MVP** : formats CSV, XLSX, XLS, TSV, PDF texte natif (l'OCR, les courriels et les exports bancaires spécialisés arrivent en phase 2 — ne pas les présenter comme disponibles). Zone de dépôt de fichier, assistant de mappage intelligent (associer les colonnes du fichier aux champs du modèle commun), score de qualité par import, mise en quarantaine des lignes douteuses avant fusion. Historique des imports avec statut (qui, quand, quel contenu — exigence de traçabilité, voir produit.md).

**Composants** : zone de dépôt sobre (pas d'illustration décorative) ; le score de qualité rendu comme la jauge horizontale du système, pas comme un pourcentage nu ; le statut de chaque import en badge sémantique (réussi = information, en quarantaine = surveillance, échec = critique).

## 3. Tableau de bord santé — écran d'accueil (module 4 + section 47)

**Objectif** : donner en un coup d'œil ce qui mérite l'attention du jour. C'est l'écran le plus important du produit et celui qui incarne le mieux la philosophie « pas 50 graphiques ».

**Utilisateur** : propriétaire/dirigeant en priorité.

**Contenu exact du PRD (section 47)**, à respecter comme trame de contenu plutôt que comme texte figé :

- Salutation courte (« Bonjour. »)
- Une phrase d'intention (« Voici ce qui mérite votre attention aujourd'hui. »)
- Section problèmes (niveau critique) — exemple donné : la marge baisse depuis trois semaines.
- Section risques (niveau important) — exemples donnés : hausse de coût fournisseur détectée, un concurrent modifie ses prix.
- Section opportunités (niveau opportunité) — exemples donnés : nouvelle demande détectée dans le marché, programme gouvernemental potentiellement pertinent.
- Trois priorités au maximum, formulées comme des actions concrètes (« Vérifier le fournisseur X », « Analyser le prix du produit Y », « Examiner le programme Z »).
- Score de santé global sur 100 (exemple : 78/100), rendu en jauge horizontale, pas en cercle.
- Une phrase de clôture rassurante quand rien d'autre ne requiert d'attention.

Le module 4 ajoute neuf dimensions détaillées derrière ce résumé (finance, ventes, trésorerie, clients, opérations, marketing, productivité, risques, croissance), chacune avec score, tendance, niveau de confiance, évolution, explication — à prévoir comme vue secondaire accessible depuis l'écran d'accueil, pas fusionnée dedans.

**Composants** : jauge horizontale pour le score global et par dimension ; badges de statut pour problèmes/risques/opportunités ; badge de fiabilité sur chaque affirmation générée (une baisse de marge observée est un FAIT, une cause probable est une ANALYSE ou une HYPOTHÈSE selon le niveau de certitude).

## 4. KPI par dimension — module 5 (+ module 6)

**Objectif** : détail chiffré derrière chaque dimension du score de santé.

**Utilisateur** : propriétaire, gestionnaire, comptable selon le domaine.

**Contenu** : listes de KPI par domaine (voir catalogue dans produit.md). Le module 6 (analyse intelligente) ajoute une lecture causale au-dessus des chiffres bruts, structurée en quatre questions : qu'est-ce qui s'est passé, pourquoi, quel est l'impact, que devrait-on faire. Exemple donné dans le PRD : les ventes ont augmenté de 12 % mais la marge a diminué de 4 %, cause probable — augmentation du coût du fournisseur X.

**Composants** : chiffres toujours en IBM Plex Mono ; la lecture causale présentée comme un court texte structuré (constat → cause probable) plutôt qu'un paragraphe continu, avec le badge de fiabilité sur la cause probable puisqu'il s'agit d'une analyse, pas d'un fait.

## 5. Centre d'alertes — module 31

**Objectif** : lister toutes les alertes actives, triées par niveau.

**Utilisateur** : propriétaire, gestionnaire.

**Contenu** : cinq niveaux (critique, important, surveillance, opportunité, information — voir produit.md), chaque alerte associée à une explication courte et, si applicable, à une action suggérée transformable en tâche.

**Composants** : liste de cartes avec rail de statut ; regroupement par niveau plutôt que tri chronologique seul, puisque c'est la priorité qui compte, pas la récence.

## 6. Centre de tâches — module 30

**Objectif** : suivre les recommandations transformées en tâches.

**Utilisateur** : propriétaire, gestionnaire.

**Contenu** : catégories — urgent, financier, commercial, marketing, opérationnel, administratif, stratégique. Chaque tâche porte un responsable, une date limite, une priorité, un statut. Le système priorise automatiquement.

**Composants** : liste ou tableau selon la densité ; priorité rendue en badge sémantique plutôt qu'en texte seul ; catégories comme filtres, pas comme colonnes séparées si la liste est courte.

## 7. Fiche recommandation — module 19

**Objectif** : détailler une recommandation avant de la transformer en tâche.

**Utilisateur** : propriétaire, gestionnaire.

**Contenu** : structure fixe en cinq blocs — Situation (que se passe-t-il), Analyse (pourquoi), Impact (quel pourrait être l'effet), Action (que faire), Priorité (faible, moyenne, élevée, urgente).

**Composants** : ces cinq blocs comme structure visuelle explicite (pas un paragraphe continu) ; priorité en badge sémantique ; bouton d'action clair pour transformer en tâche (« Créer la tâche », verbe actif, pas « Soumettre »).

## 8. Rapports — quotidien, hebdomadaire, mensuel (modules 23-25)

**Objectif** : lecture d'un rapport généré automatiquement. Prioriser le rapport quotidien pour le premier écran ; hebdomadaire et mensuel réutilisent la même structure avec plus de contenu.

**Utilisateur** : propriétaire, gestionnaire, comptable, conseiller.

**Contenu quotidien** : résumé (état général, évolution, événements importants), performance (ventes, finance, opérations), top risques, top opportunités, actualités externes pertinentes, trois à cinq actions prioritaires, automatisations disponibles. L'hebdomadaire ajoute une comparaison semaine actuelle / précédente / tendance historique. Le mensuel ajoute un résumé exécutif automatique.

**Composants** : structure en sections courtes et scannables, pas un document continu ; chaque section peut réutiliser les composants des écrans 3-7 (jauges, badges) plutôt que réinventer une présentation propre au rapport.

## 9. Assistant conversationnel — module 22

**Objectif** : répondre en langage naturel à partir des données disponibles.

**Utilisateur** : tous profils.

**Contenu** : exemples de questions donnés par le PRD — pourquoi mes bénéfices baissent-ils, quels sont mes trois plus gros risques, quel client est le plus rentable, où puis-je réduire mes dépenses, que dois-je faire cette semaine, que s'est-il passé depuis lundi, quelles opportunités as-tu trouvées. L'IA doit toujours indiquer les sources utilisées pour sa réponse.

**Composants** : interface de conversation sobre ; chaque réponse porte un badge de fiabilité et, quand pertinent, une mention compacte des sources (pas une bibliographie complète, une ou deux références suffisent pour la maquette).

---

## Écrans hors MVP (à ne concevoir que sur demande explicite)

Rapport semestriel (module 26), rapport annuel (module 27), mémoire décisionnelle (module 28), radar externe détaillé (module 14), configuration de l'automatisation (module 21). Le PRD les décrit, mais les prioriser dans une maquette donnerait une fausse impression d'avancement du produit avant que le MVP ne soit lui-même construit.
