---
name: design-copilote-pme
description: Génère les maquettes et l'identité visuelle du Copilote PME, le système intelligent de pilotage pour PME décrit dans le PRD d'Issa — dashboard santé, centre d'alertes, centre de tâches, rapports, assistant conversationnel, import de données, onboarding. Contient un système de design déjà tranché (palette, typographie, jauges de pilotage, badges de statut et de fiabilité FAIT/ANALYSE/HYPOTHÈSE/RECOMMANDATION/PRÉVISION) à réutiliser sur chaque écran pour garder une identité cohérente, ainsi que le contenu produit condensé (utilisateurs, modules, écrans prioritaires du MVP). Utilise ce skill dès qu'Issa demande de concevoir, dessiner, maquetter, prototyper ou visualiser un écran, un flux ou un composant de cette application — même formulé simplement comme montre-moi à quoi ça ressemblerait, fais une maquette de X, crée l'écran Y — sans qu'il ait à redécrire le produit ou rouvrir le PRD à chaque fois.
---

# Design du Copilote PME

## Ce que couvre ce skill

Ce skill réunit la direction visuelle déjà tranchée pour le Copilote PME — le système intelligent de pilotage, d'anticipation et d'aide à la décision pour PME décrit dans le PRD d'Issa (v1.1) — et le contenu produit condensé nécessaire pour concevoir n'importe quel écran de cette application sans avoir à rouvrir le PRD à chaque demande.

Avant de concevoir un écran :

- lire `references/ecrans.md` pour son contenu précis (objectif, données, copie) ;
- lire `references/produit.md` pour la vision, les utilisateurs et les règles produit qui doivent transparaître dans le design (principes de confiance, niveaux d'alerte, portée du MVP) ;
- partir des composants de `references/composants.md` (jauges, badges, cartes) plutôt que d'improviser des équivalents visuellement proches mais légèrement différents d'un écran à l'autre — c'est ce qui garde l'identité cohérente d'une génération à l'autre ;
- `references/prd-complet.md` contient le PRD intégral, pour les cas non couverts par les fichiers ci-dessus.

## Direction déjà tranchée — ne pas la renégocier

Ce qui suit constitue l'identité visuelle du produit. Elle a été choisie une fois pour garder une cohérence entre des écrans générés à des moments différents ; ne pas repartir d'une palette ou d'une typographie neutre à chaque nouvelle demande, sauf si Issa demande explicitement de la revoir.

**Révision du 2026-08-21** : direction assouplie à la demande explicite d'Issa (langage utilisateur simple, palette plus douce et harmonisée, interface plus vivante et soignée), en remplacement de la direction initiale strictement sobre. Le sérieux d'un outil de pilotage pour dirigeant reste non négociable — ce n'est pas devenu une application grand public — mais le ton visuel est désormais chaleureux et arrondi plutôt que froid et clinique. Deux explorations ont été proposées (« sobre-chaleureuse » et « ronde-vivante ») ; Issa a retenu la seconde. C'est elle qui est documentée ci-dessous.

### Ton

Un outil de pilotage fiable pour un dirigeant qui manque de temps — mais un outil qu'on a envie d'ouvrir, pas un tableau de bord froid. La rigueur des données et la clarté de lecture restent non négociables (le PRD reste explicite : l'écran d'accueil ne montre pas 50 graphiques, section 47), mais l'exécution visuelle peut être chaleureuse, arrondie et vivante — mouvement discipliné à l'ouverture de l'écran, formes accueillantes, une seule couleur d'accent utilisée avec plus d'affirmation plutôt qu'une palette froide et plate.

### Palette

Marque (5 tons) :

| Rôle | Nom | Hex |
|---|---|---|
| Texte, structure forte | encre | `#26332C` |
| Fond de page | papier | `#F3F7F1` |
| Surface (cartes, panneaux) | surface | `#FFFFFF` |
| Accent, interactif, CTA | signal | `#1B8564` |
| Accent appuyé (hover, dégradés, valeurs positives fortes) | signal-fort | `#0F6B4F` |
| Rail de navigation (fond, toujours sombre, indépendant du thème) | nav | `#17352A` |

Le fond de page reprend délibérément une teinte proche de l'accent (vert très désaturé) plutôt qu'un gris neutre — c'est ce qui rend la palette « harmonisée » plutôt qu'un accent isolé sur un fond froid. Texte secondaire : `#6A7A70` (bordures : `#DCE9DA`).

Statut sémantique (5 tons, jamais utilisés pour la marque ou un bouton d'action — réservés à l'état d'une donnée) :

| Niveau | Hex | Usage |
|---|---|---|
| Critique | `#A23B2E` | intervention immédiate |
| Important | `#A6650A` | intervention prochaine |
| Surveillance | `#8C7A2A` | évolution à surveiller |
| Opportunité | `#2E7D4F` | possibilité intéressante |
| Information | `#3D6482` | contexte, sans action requise |

Ces cinq niveaux reprennent les couleurs 🔴🟠🟡🟢🔵 du PRD (section 31) — mais jamais rendues en emoji à l'écran. Toujours un badge : pastille de 8px plus libellé texte (voir `StatusBadge` dans composants.md). Neutres additionnels : bordure `#DCE0DD`, texte secondaire `#5B6660`.

### Typographie

- **IBM Plex Sans** — titres et texte courant (400 pour le texte, 600 pour les titres). Une seule famille sans-serif dans toute l'application : la cohérence prime sur la personnalité typographique pour un outil de données.
- **IBM Plex Mono** — tous les chiffres, sans exception : scores, KPI, montants, dates dans les tableaux. C'est la signature typographique du produit — chaque donnée chiffrée a la même texture visuelle qu'une lecture d'instrument.

Charger ces polices via Google Fonts dans les artifacts HTML. En React, les déclarer dans le CSS de l'artifact ; à défaut de chargement externe, replier sur une police système à chasse fixe pour les chiffres plutôt que sur la police par défaut.

### Composants signature

- **Jauges horizontales** avec graduations, jamais de jauge circulaire ni de donut chart — clin d'œil direct au vocabulaire de « pilotage ». Utilisées pour tout score : santé globale, dimension, risque, opportunité, confiance. Remplissage en dégradé `signal-fort → signal` plutôt qu'un aplat, animé à l'ouverture de l'écran (transform-origin gauche, ~1s, désactivé si `prefers-reduced-motion`).
- **Rail de statut** : bordure gauche de 4px dans la couleur sémantique, sur toute carte porteuse d'un état (alerte, tâche, recommandation).
- **Badge de fiabilité** : chaque affirmation générée par le système (section 44 du PRD, « principes de confiance ») porte une étiquette discrète — FAIT / ANALYSE / HYPOTHÈSE / RECOMMANDATION / PRÉVISION — petites majuscules grises, jamais colorées, jamais omises. C'est une règle produit, pas une option de style : le PRD insiste sur le fait de ne jamais présenter une hypothèse comme une certitude. Ce badge reste gris neutre même dans la direction assouplie — ne jamais le colorer, même dans un souci d'harmonie visuelle.
- **Chips de statut** (compteurs par sévérité, etc.) : fond dérivé de la couleur du texte elle-même (`color-mix(in srgb, currentColor 15%, transparent)`), jamais un blanc/noir fixe — condition pour rester lisible aussi bien en thème clair qu'en thème sombre.
- **Formes rondes** : coins à 20–24px sur les cartes et panneaux (contre 6px dans la direction initiale), boutons et chips en pilule complète (`border-radius: 999px`). Le rail de navigation a son coin extérieur arrondi (28px) plutôt qu'un angle droit.
- **Survol vivant** : les cartes s'élèvent et grossissent légèrement au survol (`translateY(-3px) scale(1.02)`), pas seulement une ombre plate. Mouvement orchestré à l'ouverture de l'écran (légère montée + fondu en cascade), jamais de micro-animations dispersées sans lien entre elles.

### Layout

Rail de navigation à gauche sur fond `nav` (`#17352A`, toujours sombre, indépendant du thème clair/sombre du contenu — c'est un élément d'identité fixe, pas une zone qui suit le thème), coin extérieur arrondi. Contenu sur fond papier, cartes en surface avec coins à 20–24px. Un écran d'accueil expose une idée dominante et trois priorités au maximum (section 47) ; les écrans de détail (KPI, rapports) peuvent être plus denses mais restent hiérarchisés — une information dominante par bloc, jamais une mosaïque de graphiques sans ordre de lecture.

### Contrainte technique de cet environnement

Les artifacts React ici n'ont pas de compilateur Tailwind : les classes arbitraires comme `bg-[#1B6E62]` ne fonctionnent pas. Utiliser les classes Tailwind de base pour la structure (espacement, flex, grid) et des styles en ligne (`style={{ background: '#1B6E62' }}`) pour les couleurs de la palette ci-dessus. Pour un rendu fidèle aux couleurs hexadécimales exactes, un artifact HTML autonome avec sa propre feuille de style reste l'option la plus fiable ; ne privilégier React que si Issa veut un livrable proche de la pile technique cible (Next.js, section 39 du PRD).

## Écrans à concevoir

Le PRD décrit des dizaines de modules ; tous ne se valent pas au même stade. Concevoir en priorité les écrans du MVP (section 37) — leur contenu détaillé est dans `references/ecrans.md` :

1. Configuration de l'entreprise (onboarding)
2. Import de données
3. Tableau de bord santé (écran d'accueil)
4. KPI par dimension
5. Centre d'alertes
6. Centre de tâches
7. Fiche recommandation
8. Rapports (quotidien, hebdomadaire, mensuel)
9. Assistant conversationnel

Les écrans hors MVP (rapport semestriel ou annuel, mémoire décisionnelle, radar externe détaillé, configuration de l'automatisation) existent dans le PRD mais ne devraient être maquettés qu'à la demande explicite d'Issa — les concevoir par défaut donnerait une fausse impression d'avancement du produit.

## Comment produire une maquette

Pour une exploration rapide en conversation, un widget interactif suffit. Pour un livrable qu'Issa veut garder, montrer ou faire évoluer, produire un artifact complet (HTML autonome ou composant React selon la contrainte technique ci-dessus) et le déposer dans le dossier de sortie.

Pour tout contenu affiché — libellés, exemples de données, textes d'état vide — utiliser en priorité les exemples réels du PRD (montants, pourcentages, noms de fournisseurs fictifs, phrases comme « la marge baisse depuis trois semaines ») plutôt que du texte générique type Lorem ipsum ou Produit A : le PRD donne déjà des exemples concrets qui rendent la maquette plus crédible.

Les principes de `frontend-design` (restreinte, exécution soignée, accessibilité, mouvement discipliné) restent utiles pour la qualité d'exécution — les appliquer par-dessus la direction ci-dessus, jamais à sa place : la direction esthétique de ce produit est déjà prise, ce skill n'a pas besoin de rejouer la phase de brainstorm à chaque écran.
