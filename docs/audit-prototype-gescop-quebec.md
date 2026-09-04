# Audit du prototype « Gescop — Pilotage PME Québec »

Archive auditée : `gescop_pilotagepmequ_bec.zip` (28 fichiers, 4 222 lignes de TypeScript/CSS/HTML).
Origine : Google AI Studio (`ai.studio/apps/219443b7-…`, voir `README.md` de l'archive).
Date de l'audit : 2026-09-04.
Copie de référence conservée dans ce dépôt : `prototypes/gescop-quebec-aistudio/`.

## 1. Ce qu'est réellement ce prototype

Une application React 19 + Vite mono-page, servie par un petit serveur Express qui expose trois routes
(`/api/health`, `/api/quebec/context`, `/api/ai/analyze`). Toutes les données affichées viennent d'un
fichier statique — `src/data/mockQuebecData.ts`, 629 lignes — qui contient deux entreprises fictives
(Boutique Boréale à Montréal, Microbrasserie du Fjord à Chicoutimi). Il n'y a ni base de données, ni
authentification, ni persistance : l'état vit dans un `useState` de `App.tsx` et disparaît au
rechargement de la page.

C'est donc une maquette interactive, pas un produit. Ce n'est pas un défaut en soi — c'est ce que
produit AI Studio — mais cela conditionne toute la lecture qui suit : les défauts de justesse listés
en §4 sont des défauts de *conception de la démonstration*, et deviendraient des défauts produit tels
quels si le code était repris comme base.

Vérifications faites : `npm install` (0 erreur), `npx tsc --noEmit` (0 erreur), `npm run build`
(succès, bundle de 722 ko), démarrage du serveur et appel réel des trois routes. Le prototype
fonctionne.

## 2. Verdict

L'écran vaut mieux que le code. Le prototype propose un enchaînement — Anomalie → Diagnostic →
Recommandation → **Décision arbitrée** → Action → Résultat mesuré — plus complet que celui de Gescop
aujourd'hui, avec deux briques que le produit actuel n'a pas du tout : le **registre de décisions**
(qui a tranché, pourquoi, quand) et la **modification d'une recommandation avant validation**. Ces
deux idées méritent d'être reprises.

Le moteur, lui, est à jeter. Les chiffres affichés ne sont pas calculés, plusieurs sont
mutuellement incohérents, et l'assistant IA fabrique des montants précis pour n'importe quelle
entreprise, y compris hors de son domaine. Un dirigeant de PME qui prendrait une décision sur la foi
de cet écran serait mal conseillé — ce qui contredit le principe fondateur de Gescop (« ne jamais
présenter une hypothèse comme un fait », charte de projet et PRD §44).

Recommandation : garder le modèle de décision et deux ou trois écrans, ne reprendre aucune ligne du
moteur de calcul ni du serveur.

## 3. Ce qui vaut la peine d'être repris

**Le registre de décisions (« Decision Ledger »).** `DecisionCenterView.tsx` demande, avant de
valider une recommandation, qui décide, à quel titre, et pourquoi — puis archive la décision avec
son horodatage, la métrique visée et le résultat attendu. Gescop n'a rien de tel : accepter une
recommandation y est un simple changement de statut (`recommendations.py`). Pour une PME où
l'arbitrage est collégial, la traçabilité de la décision a une valeur propre, distincte du suivi de
l'action.

**L'arbitrage à trois issues.** Approuver / Ajuster / Rejeter, avec justification obligatoire dans
les trois cas. Le « Ajuster » est le plus intéressant : le dirigeant réécrit l'action proposée avant
de la lancer, et c'est sa version qui est suivie. Gescop force aujourd'hui un choix binaire.

**La structure du diagnostic en quatre temps** — fait observé, corrélation, hypothèse racine, impact
chiffré (`types.ts`, `DiagnosticItem`). C'est exactement la discipline que Gescop s'impose déjà dans
`anomalies.py` avec le triplet `why` / `impact_amount` / `action`, mais le prototype va plus loin en
séparant explicitement la corrélation observée de l'hypothèse qu'on en tire. Nommer cette
distinction dans le modèle de données est une bonne idée à emprunter.

**Le cadrage québécois.** NEQ au profil d'entreprise, TPS/TVQ, formatage `fr-CA`, connecteurs
Acomba / Lightspeed / Square. Gescop est aujourd'hui générique sur ce plan (`CURRENCY_CHOICES`
CAD/USD/EUR et rien d'autre). Si la cible est bien la PME québécoise, c'est une direction produit à
retenir — étant entendu que le prototype ne fait que l'afficher, pas la calculer (voir 4.4).

**La priorisation chiffrée du diagnostic** (`calculatedPriority`, 94 et 96 sur 100). L'idée
« Impact × Urgence × Probabilité » est saine ; le prototype l'affiche sans jamais la calculer, mais
elle manque à Gescop, qui ordonne ses recommandations par catégorie et non par enjeu.

## 4. Défauts

### 4.1 Bloquants de confiance

**F1 — L'assistant IA invente des montants précis pour n'importe quelle entreprise.**
`server.ts:52-79` : quand `GEMINI_API_KEY` est absente, la route `/api/ai/analyze` renvoie un
diagnostic pré-écrit — écart budgétaire « +12 % », gain « +3 800 $ CAD », trésorerie libérée
« 8 500 $ CAD » — quel que soit le contenu de la question. Vérifié en exécution : interrogé sur
« Garage Tremblay, secteur mécanique, dois-je embaucher ? », le serveur répond par une analyse de
dépenses publicitaires et de point de commande, avec ces mêmes montants. Un second bloc identique
existe en cas d'échec de l'appel Gemini (`server.ts:119-141`), et un troisième côté client
(`AiStrategicAdvisorModal.tsx:88-96`). Le champ `source` (`heuristic_engine`) qui distinguerait la
réponse fabriquée d'une vraie analyse n'est jamais affiché : le composant ne lit que `data.diagnostic`
et `data.recommendations` (lignes 76-85). L'utilisateur ne peut pas savoir qu'il lit une fiction.
C'est la violation la plus grave, et elle est structurelle : le repli n'est pas un message d'erreur,
c'est un faux diagnostic.
Correction : un repli doit dire qu'il ne peut pas répondre. Jamais produire de chiffre.

**F2 — Le score de santé monte parce qu'on a cliqué, pas parce que quelque chose s'est amélioré.**
`App.tsx:114-118` : approuver une recommandation ajoute +2 au score global et +4 à la dimension
gouvernance, immédiatement, avant toute exécution. `App.tsx:244-248` : déclarer un résultat
« atteint » ajoute encore +3 et +3. Le score devient une récompense d'usage du logiciel. Gescop a
rencontré exactement ce piège en sens inverse (une entreprise perdant 62 % de son résultat notée
97/100) et l'a corrigé par la règle de déclassement de `health.py` ; il ne faut pas le réintroduire.

**F3 — Le résultat mesuré est déclaré par l'utilisateur, pas mesuré.**
`ActionTrackingView.tsx:171-199` : l'« Outcome Engine » est un champ texte libre plus un menu
déroulant où l'on choisit soi-même « atteint / partiel / échec ». Rien n'est confronté aux données.
Combiné à F2, cela signifie qu'un utilisateur peut porter son score de 71 à 100 sans qu'aucun chiffre
de son entreprise n'ait bougé. Le lot 5 de Gescop fait l'inverse — `baseline_value` figée à la
création de l'action, `outcome_value` recalculée sur les transactions réelles — et c'est la bonne
approche.

**F4 — Un diagnostic entier est codé en dur et s'affiche pour toutes les entreprises.**
`MarketingModule.tsx:106-165` : la carte « Diagnostic Croisé Gescop : Chute de Rentabilité
Marketing » (CPA Meta +59 %, rupture des tailles M et L, réallouer 4 000 $) est du JSX statique. Elle
raconte l'histoire de Boutique Boréale et reste identique quand on bascule sur la Microbrasserie du
Fjord, qui ne vend ni manteaux ni tailles. Même problème sur la projection de trésorerie :
`FinanceModule.tsx:53-60` code en dur les mois M-2, M-1 et les trois mois de prévision
(84 000 / 91 000 / 98 000 / 104 000 / 112 000 $) ; seul le mois courant vient des données. Une PME
voit donc, présentée comme sa prévision de trésorerie, celle d'une autre entreprise.

**F5 — L'import de fichier est une mise en scène.**
`ConnectorsView.tsx:120-133` : la zone de dépôt déclenche, au clic comme au dépôt, le même appel
codé en dur — `handleSimulatedFileUpload('grand_livre_ventes_acomba_2025.csv', 1840)`. Aucun fichier
n'est lu ; le nom et les 1 840 lignes sont fixes. Un utilisateur qui dépose son propre grand livre
voit « 1 840 lignes normalisées avec succès » et un nom de fichier qui n'est pas le sien. Sur le même
écran, le badge « Connecté » est écrit en dur (`ConnectorsView.tsx:84`) et ignore `conn.status`, qui
peut valoir `inactif` — un connecteur mort s'affiche comme actif.

### 4.2 Justesse des calculs et cohérence des données

**F6 — Le CAC de Boutique Boréale est faux d'un facteur deux.** Les données donnent
`marketingSpend: 14850` et `customersAcquired: 642` (`mockQuebecData.ts`), soit un CAC de **23,13 $**.
Le champ `cac` affiche **44,50 $**, qui est en réalité le CPA de la seule campagne Meta (44,56 $).
Conséquences en cascade : la carte « Coût d'Acquisition (CAC) » du cockpit
(`ExecutiveCockpit.tsx:126-137`) affiche 44,50 $ contre une cible de 28 $ ; l'anomalie critique n° 1
en tire un dépassement de « +59 % » ; le ratio LTV/CAC affiché est 6,4 alors que le ratio réel est
12,3 ; et la recommandation `rec-1` — couper Meta, réaffecter 4 000 $ — repose entièrement sur ce
chiffre. Le raisonnement resterait valable s'il était présenté comme un problème de canal ; présenté
comme le CAC de l'entreprise, il est faux. La seconde entreprise, elle, est cohérente
(8 900 / 410 = 21,71 $ ≈ `cac: 21.70`), ce qui confirme qu'il s'agit d'une erreur et non d'une
convention.

**F7 — La carte fiscale annonce une méthode qu'elle n'applique pas.** `FinanceModule.tsx:164` :
« Calcul automatique des taxes nettes sur ventes moins CTI/RTI admissibles ». Les données sont un
pourcentage plat du chiffre d'affaires brut : 138 500 × 5 % = 6 925 $ (`tpsPayable`), × 9,975 % =
13 815 $ (`tvqPayable`) — aucun crédit de taxe sur intrants n'est déduit. Pour une PME qui achète
81 700 $ de marchandises, l'écart avec la remise réelle se compte en milliers de dollars, et
toujours dans le sens qui surestime la provision. Annoncer les CTI/RTI et ne pas les calculer est
pire que de ne rien annoncer.

**F8 — Les repères économiques québécois sont figés dans le code et périmés.**
`server.ts:14-30` : taux directeur 2,75 %, IPC Québec 2,3 %, marge brute moyenne 38,5 %, avec
`updatedAt: '2025-Q3'` — environ un an de retard. Aucun mécanisme de mise à jour. Par ailleurs
l'endpoint `/api/quebec/context` qui les expose n'est appelé par aucun composant (vérifié :
`src/` ne contient qu'un seul `fetch`, vers `/api/ai/analyze`). Ces repères ne servent donc à rien,
sauf à alimenter le prompt Gemini avec des données obsolètes. À l'écran, la « cible québécoise » de
marge brute (`ExecutiveCockpit.tsx:111`) n'est pas ce benchmark mais un champ propre à l'entreprise
fictive, présenté comme une norme sectorielle.

**F9 — Petites incohérences.** Le réapprovisionnement d'urgence commande 40 unités quel que soit le
produit, l'écart au point de commande ou le rythme de vente (`App.tsx:263-264`) — 40 parkas comme 40
caisses de bière. Le score global est la moyenne non pondérée des quatre dimensions (71,75 → 71 ;
78 → 78), sans qu'aucune pondération soit définie ni justifiée. L'autonomie de trésorerie de la
Microbrasserie est affichée à 7,0 mois pour 145 000 / 21 000 = 6,9. Le total d'écart budgétaire
(`FinanceModule.tsx:67-70`) porte sur les postes listés, qui incluent la masse salariale et les
achats pour une entreprise et pas pour l'autre : les deux pourcentages ne sont pas comparables.

### 4.3 Sécurité

**F10 — La route IA est ouverte, non authentifiée et non limitée.** `server.ts:47` : `/api/ai/analyze`
accepte n'importe quel POST, sans jeton, sans quota, sans limite de taille utile au-delà du défaut
d'Express. Quiconque connaît l'URL consomme la clé Gemini du propriétaire. Gescop impose
`require_company_access` sur tout endpoint scopé entreprise et dispose déjà d'un `rate_limit.py` ;
rien de tel ici.

**F11 — Injection de prompt directe.** `server.ts:82-107` : le champ `prompt` du corps de requête est
concaténé sans échappement dans le prompt système, après les données de l'entreprise et avant les
consignes de format. Un utilisateur peut donc réécrire le rôle du modèle et faire produire à
« l'analyste stratégique Gescop » n'importe quel contenu, sous l'identité du produit.

**F12 — Aucune identité derrière le registre de décisions.** `DecisionCenterView.tsx:43-45` : le nom
du décideur et son titre sont des champs texte pré-remplis (« Marc-André Côté », « Directeur
Général ») que l'utilisateur peut écrire à sa guise. Un registre d'arbitrage dont l'auteur est
déclaratif n'a aucune valeur probante — or c'est précisément la brique la plus intéressante du
prototype (§3). Elle n'a de sens qu'adossée à une authentification.

**F13 — Trois vulnérabilités modérées dans les dépendances.** `npm audit` : `qs` (contournement de
`array-limit`, déni de service via `isBuffer`), remontant par `body-parser` et `express@4.22.2`.
Corrigées par `npm audit fix`.

### 4.4 Conformité

**F14 — Une affirmation de conformité non fondée, affichée dans le produit.**
`ConnectorsView.tsx:165` : « Hébergement sécurisé au Canada · Respect strict de la Loi 25 québécoise
sur la protection des données d'entreprise ». Rien dans le code ne soutient cette phrase : il n'y a
ni hébergement, ni chiffrement, ni politique de conservation, ni registre de consentement. Pire,
l'écran voisin envoie le nom de l'entreprise, son chiffre d'affaires, sa marge et son CAC à l'API
Gemini de Google (`AiStrategicAdvisorModal.tsx:64-74`) sans mention ni consentement, sans garantie de
résidence des données. Une allégation de conformité affichée à un client est un risque juridique
propre, indépendamment de la qualité du reste. À retirer tant qu'elle n'est pas vraie.

### 4.5 Architecture et exploitation

**F15 — Le port d'écoute est codé en dur.** `server.ts:10` : `const PORT = 3000`, sans lecture de
`process.env.PORT`. Sur Cloud Run — la cible annoncée par `.env.example` — le port est injecté par
la plateforme ; le conteneur ne répondra pas.

**F16 — Aucune persistance.** Décisions, actions, résultats mesurés vivent dans `useState`
(`App.tsx:28`). Un rechargement efface le registre de décisions. Pour un produit dont l'argument
principal est la mémoire décisionnelle, c'est la fonctionnalité centrale qui n'existe pas.

**F17 — Aucune séparation entre données de démonstration et modèle.** Les deux entreprises fictives
sont importées directement par `App.tsx`. Il n'y a pas de couche d'accès aux données à substituer :
brancher une vraie source imposerait de réécrire l'ensemble des composants, qui reçoivent tous des
objets de la forme exacte de `CompanyDataSet`.

### 4.6 Qualité de code

**F18 — TypeScript n'est pas en mode strict.** `tsconfig.json` ne déclare pas `"strict": true`. Le
projet compile sans erreur (vérifié), mais cette absence de garde-fou est ce qui laisse passer des
incohérences comme F6 : rien n'oblige `cac` à être cohérent avec `marketingSpend / customersAcquired`,
et rien ne le signalerait.

**F19 — Aucun test, aucun lint.** Le script `lint` est `tsc --noEmit` — un typage, pas un linting.
Zéro test unitaire ou d'intégration. Sur les 4 222 lignes, aucune n'est couverte.

**F20 — Accessibilité.** La zone de dépôt de fichier est un `div` cliquable sans rôle ni gestion
clavier (`ConnectorsView.tsx:117-140`) ; la fenêtre modale de l'assistant n'a ni piège de focus, ni
fermeture par Échap, ni `role="dialog"` (`AiStrategicAdvisorModal.tsx:105`). Le produit est
inutilisable au clavier sur ces deux parcours.

**F21 — Bundle monolithique.** 722 ko de JavaScript en un seul morceau (208 ko compressés), Recharts
et Lucide inclus en entier, sans découpage. Vite le signale au build.

## 5. Comparaison avec Gescop tel qu'il existe

| | Prototype AI Studio | Gescop (ce dépôt) |
|---|---|---|
| Données | 2 entreprises fictives en dur | Ingestion réelle CSV/XLSX/PDF, mise en quarantaine des lignes invalides |
| Calculs | Champs pré-remplis, plusieurs incohérents | `kpis.py`, `variance.py`, `anomalies.py`, testés |
| Score de santé | Moyenne de 4 nombres fixes, + points au clic | 5 dimensions expliquées, règle de déclassement |
| Persistance | Aucune | PostgreSQL, migrations Alembic |
| Authentification | Aucune | JWT, isolation par entreprise (`require_company_access`) |
| Tests | 0 | 213 réussis, 1 ignoré |
| Registre de décisions | Présent (qui, pourquoi, quand) | **Absent** |
| Ajustement d'une recommandation | Présent | **Absent** (accepter / rejeter seulement) |
| Priorisation chiffrée | Affichée (non calculée) | **Absente** |
| Ancrage québécois | NEQ, TPS/TVQ, connecteurs locaux (affichés) | Générique |
| Mesure du résultat | Déclarative | Calculée sur les transactions (lot 5) |

Le prototype n'apporte rien au moteur. Il apporte trois manques réels du produit, tous situés sur
l'étape « Décider » de la boucle Détecter → Comprendre → Décider → Agir → Mesurer.

## 6. Ce que je recommande d'en faire

Ne pas repartir de ce code. Le reprendre comme base imposerait de réécrire le moteur, le serveur, la
persistance et l'authentification — c'est-à-dire tout ce que Gescop a déjà — pour conserver des
écrans qui se refont en quelques jours.

Reprendre en revanche trois éléments, dans cet ordre de valeur :

1. **Le registre de décisions**, adossé à l'authentification existante (l'auteur vient du JWT, pas
   d'un champ texte). Une entité `Decision` entre `Recommendation` et `Action` : qui a tranché, quoi,
   pourquoi, quand, et quelle métrique était visée. C'est le chaînon manquant entre le lot 5 et la
   promesse de gouvernance du PRD.
2. **L'arbitrage à trois issues** avec justification obligatoire, dont le « Ajuster » qui laisse le
   dirigeant réécrire l'action avant de la lancer.
3. **La priorisation chiffrée** des diagnostics, à condition de la calculer et de l'expliquer —
   sinon elle rejoint F1.

À écarter explicitement : le score qui monte au clic (F2), le résultat auto-déclaré (F3), le repli
IA qui invente des chiffres (F1), l'affirmation Loi 25 (F14).

## 7. Reste à trancher

La direction du chantier n'est pas décidée par cet audit : reprendre ces trois briques dans Gescop,
ou repartir sur un projet distinct ciblé PME québécoise (NEQ, TPS/TVQ réelles avec CTI/RTI,
connecteurs Acomba/Lightspeed), sont deux trajectoires différentes. La première capitalise sur 213
tests et un moteur qui fonctionne ; la seconde n'a de sens que si la cible québécoise justifie un
produit séparé — ce que l'audit ne permet pas d'établir.

## Annexe — méthode

Lecture intégrale des 28 fichiers. Vérification arithmétique de chaque valeur dérivée des deux jeux
de données (marges, taxes, autonomie de trésorerie, CAC, LTV/CAC, taux de conversion, totaux de
campagnes, score global). Installation des dépendances, `tsc --noEmit`, `npm run build`, `npm audit`.
Démarrage du serveur en mode production et appel réel des trois routes, dont `/api/ai/analyze` avec
une entreprise et une question hors du scénario de démonstration.
