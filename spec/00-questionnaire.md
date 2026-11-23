# PULSE V1 — Questionnaire Spec Driven Development (v2)

> **Mode d'emploi.** Écrivez votre réponse sous **Réponse :**. Si la *Proposition* vous convient, écrivez simplement « OK ».
> Vos réponses servent à rédiger `spec/`, puis le code est généré à partir de ces spécifications.
> **Commencez par la section 0** : Q0.1 et Q0.2 conditionnent presque tout le reste.
>
> Abréviations :
> - documents de référence : CDC = cahier des charges ; PROD = HAC-PROD-001 ; TECH = HAC-TECH-001 ; API = HAC-API-001 ; DATA = HAC-DATA-001 ; ACC = HAC-ACC-001 ; UX = HAC-UX-001 ;
> - notions : RG = règle de gestion ; ACC-… = critère d'acceptation ; REC-… = scénario de recette ; ADR = fiche de décision d'architecture ;
> - termes techniques : BFF = l'API PULSE sert d'intermédiaire entre l'interface et le service d'auth ; CSRF = attaque où un autre site envoie une requête à la place de l'utilisateur.

**Contraintes imposées, non négociables** (rappel, pas des questions) :

- Application **web responsive** ; pas d'app mobile native (CDC §3, PROD §2).
- Une expérimentation supplémentaire n'est permise **qu'après la démonstration de F1 à F6** (CDC §6).
- **Simulateur d'auth** :
  - conforme à HAC-API-001 : `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, codes 200, 400, 401, 403 et 503 ;
  - URL configurable ;
  - consommé uniquement via HTTP.
- **Sécurité** :
  - droits contrôlés **pas uniquement dans l'interface** ;
  - aucun mot de passe renvoyé, aucun secret dans le dépôt ;
  - données **HAC-DATA-001** uniquement ;
  - l'employeur ne voit aucune donnée individuelle.
- **Lancement depuis le dépôt** : si l'app ne se lance pas à partir des instructions, la V1 est « non acceptable » (ACC §12).
- **Règle d'élimination** : une note ≤ 7/20, ou deux notes entre 7,1 et 11, fait échouer la MSPR.
- **Équipe et temps** : 21 h de préparation, 4 personnes. Chacun doit savoir expliquer une partie du code.

### Ce que la relecture contradictoire a changé (v1 → v2)

Deux relecteurs indépendants (un « jury EPSI » et un « architecte Rust/Tauri ») ont relu la v1.

| Point | Avant (v1) | Maintenant (v2) |
|---|---|---|
| Cookie dans l'app Tauri | « Même cookie httpOnly dans Tauri » | **Faux** : la page packagée vient de `tauri://localhost`, le cookie n'est jamais envoyé. Question reformulée (Q1.4, Q5.6). |
| Persistance | SQLite + sqlx | sqlx exige une base au moment de compiler : piège pour les débutants. Q7.1 rouverte. |
| Place de Tauri | Cible de démo | Le CDC n'autorise les extras qu'après F1–F6 : Tauri sort du chemin critique (Q1.1). |
| Réécriture en Rust | Proposée d'emblée | À trancher **après** le niveau Rust réel (Q0.2) et avec un plan B daté (Q14.2). |
| Refus d'accès | 404 partout | 404 pour la ressource d'un autre utilisateur, **403** pour un refus de rôle (Q4.4). |
| Limite de tentatives | Par adresse e-mail | Révélerait l'existence d'un compte et peut bloquer Alex en démo : **par IP** (Q6.2). |
| Contrat d'API | Deux sources de vérité (OpenAPI à la main + `ts-rs`) | Une seule source (Q4.2). |

Ajouts de la v2 :
- justification de Rust face au SI Java (Q0.5) ;
- machine de démo (Q1.5) ;
- comportement en cours de session (Q5.7 à Q5.9) ;
- cas limites des transitions (Q7.8 à Q7.10) ;
- gestion des contenus (Q7.11) ;
- tests TypeScript réutilisés comme filet (Q10.6) ;
- registre des anomalies (Q10.7) ;
- auteurs des commits (Q11.7).

---

## 0. Intention

### Q0.1 — Pourquoi Tauri ?
Plusieurs motivations possibles : montrer du Rust au jury, livrer une app installable, un choix imposé ou attendu par le formateur, un intérêt personnel.
Si le formateur ne l'exige pas, Tauri est la **première chose à couper** quand le temps manque.
**Réponse :**

### Q0.2 — Quel est le niveau réel de chacun ?
À évaluer pour Rust, TypeScript/React, Git et SQL : jamais / tutoriels / projet perso / pro.
La réponse conditionne Q0.4, la répartition (§11) et la quantité de Rust qu'on peut se permettre. Le CDC §9 dit : « Une solution […] que l'équipe ne sait ni expliquer ni vérifier » n'est pas maîtrisée.
**Réponse (un par membre) :**
- Mael :
- Grégory :
- Maxime :
- Simon :

### Q0.3 — Qu'est-ce qu'une soutenance réussie pour vous, et qu'est-ce qui serait un échec même si tout fonctionne ?
Exemples : note visée, démo sans accroc, effet technique, chacun maîtrise sa partie.
**Réponse :**

### Q0.4 — Que fait-on du code TypeScript déjà écrit ?
Il existe déjà une API Node, un simulateur, un front React et 48 tests.
Options :
- (a) tout jeter et régénérer depuis les specs ;
- (b) garder le front React, réécrire l'API et le simulateur en Rust ;
- (c) tout garder et écrire les specs a posteriori ;
- (d) garder le TypeScript comme version livrée, et porter en Rust seulement si le niveau le permet.

**Proposition :** dépend de Q0.2. Si au moins deux membres ont déjà écrit du Rust : (b). Sinon : (d).
Dans les deux cas, les 48 tests deviennent le filet de sécurité (Q10.6).
**Réponse :**

### Q0.5 — Comment défendre Rust devant le jury ?
Le SI existant est en Java/Spring. TECH §3.2 demande d'« éviter de construire une version qui nécessiterait son remplacement », et la V2 doit reprendre la V1. Il faut un argument écrit (fiche de décision ADR) qui explique pourquoi Rust ou TypeScript plutôt que Java, et comment la V2 reprend ce code.
**Proposition :** l'argument tient sur trois points :
1. PULSE est un composant **indépendant**, branché uniquement par contrats HTTP ;
2. le langage est interchangeable grâce au contrat OpenAPI ;
3. aucune dépendance au socle Spring.
**Réponse :**

---

## 1. Cible d'exécution

### Q1.1 — Sur quoi PULSE tourne-t-il pendant la démo ?
Options :
- (a) navigateur uniquement ;
- (b) Tauri desktop uniquement ;
- (c) navigateur **puis** Tauri, en bonus présenté après F1–F6 ;
- (d) Tauri desktop + mobile.

**Proposition :** (c). Toute la démo F1–F6 se fait dans le navigateur, sur PC puis sur smartphone. Tauri est montré à la fin, en 1 minute, comme « ouverture ». On écarte (b), qui ne prouve pas le responsive, et (d), puisque le mobile natif est exclu.
**Réponse :**

### Q1.2 — Si Tauri est livré, pour quels systèmes ?
**Proposition :** seulement les OS de vos postes (macOS ?). Compiler pour Windows depuis un Mac est expérimental et la CI est bloquée (Q9.5).
**Réponse :**

### Q1.3 — Démo en local ou sur une URL publique ?
**Proposition :** en local, avec une **vidéo de secours**. Une URL publique exposerait les mots de passe de démo et compliquerait la bascule 503 (Q9.2).
**Réponse :**

### Q1.4 — Comment l'app Tauri joint-elle l'API et le simulateur ?
L'app installée n'embarque pas de serveur. Options :
- (a) la fenêtre Tauri **charge l'URL servie par l'API** (`http://localhost:4000`) : même origine que le web, aucun problème de cookie ou de CORS ;
- (b) l'interface est embarquée dans l'app et appelle l'API à distance : il faut un jeton Bearer en mémoire, des règles CORS et une URL figée au moment du build ;
- (c) Tauri lance lui-même l'API et le simulateur comme processus annexes (« sidecars »).

**Proposition :** (a), à documenter ainsi : « lancer d'abord `pnpm dev` (ou le script de démo), puis l'app ». C'est la solution la plus simple et la seule qui ne casse pas l'authentification.
**Réponse :**

### Q1.5 — Sur quelle machine se fait la démo ?
OS, droits administrateur, Rust installé ou non, accès réseau, et prise d'un smartphone sur le même Wi-Fi pour le test responsive.
**Réponse :**

---

## 2. Architecture

### Q2.1 — Monolithe ou services séparés ?
Dans tous les cas, il y a deux processus : PULSE et le simulateur d'auth. Pour PULSE :
- (a) monolithe modulaire (une API, des modules par domaine) ;
- (b) un service par domaine ;
- (c) pas de serveur, toute la logique dans des commandes Rust de Tauri.

**Proposition :** (a). Les deux relecteurs le confirment : c'est la seule option qui donne du web responsive **et** des droits contrôlés côté serveur. (b) est hors périmètre. (c) n'a pas de version web.
**Réponse :**

### Q2.2 — Où vit la logique métier ?
**Proposition :**
- un module `domain` (en Rust : une crate `pulse-domain`) qui contient les règles pures ;
- **ce module ne dépend ni du serveur web, ni de la base de données, ni de l'exécution asynchrone** ;
- l'API ne fait que transporter les requêtes vers ces règles.

**Réponse :**

### Q2.3 — Organisation du dépôt
**Proposition :** monorepo.
- En Rust : un workspace Cargo avec `pulse-domain`, `pulse-api` et `auth-simulator`, plus `apps/web` et `apps/desktop`.
- `apps/desktop` reste **hors des membres par défaut** du workspace. Sinon, chaque build ou test de l'API compile aussi Tauri, ce qui est lent et demande des bibliothèques système.

**Réponse :**

### Q2.4 — Faut-il préparer la V2 dès maintenant ?
**Proposition :** minimal. Une seule abstraction de stockage (un trait `Store`, pas un par entité) et un contrat OpenAPI exporté. Le reste se décrit dans L7.
**Réponse :**

---

## 3. Stack technique

### Q3.1 — Framework HTTP Rust
**Proposition :** Axum **0.8**, avec une version figée. Attention : les exemples en ligne et l'IA mélangent les versions 0.6, 0.7 et 0.8. Par exemple, les routes s'écrivent `/{id}` et plus `/:id`, sinon l'app plante au démarrage.
**Réponse :**

### Q3.2 — Framework front
**Proposition :** React + Vite + TypeScript, l'existant. Un front 100 % Rust (Leptos) demanderait plus de 25 h : écarté.
**Réponse :**

### Q3.3 — Versions et outillage
**Proposition :**
- Rust figé à une version précise dans `rust-toolchain.toml` ;
- Node 22 + pnpm ;
- vérifications : `cargo fmt`, `clippy`, `cargo-deny`, `eslint`, `prettier`.

**Réponse :**

---

## 4. API et contrats

### Q4.1 — Style d'API
**Proposition :** REST JSON versionné `/api/v1/...`. Attention, l'existant expose `/api/auth/login` sans `v1` : à aligner.
**Réponse :**

### Q4.2 — Source de vérité du contrat
Options :
- (a) OpenAPI écrite à la main, puis le code (environ 25 endpoints à maintenir en double) ;
- (b) OpenAPI **générée depuis le code** (`utoipa`), exportée et versionnée dans `spec/api/` ; le front génère ses types à partir de ce fichier.

Le contrat **d'auth** (`spec/api/auth.openapi.yaml`) reste écrit à la main dans les deux cas, parce que c'est un contrat externe imposé.
**Proposition :** (b). Le *spec-driven* est porté par les specs Markdown (règles, critères), et le contrat généré prouve que le code les respecte.
**Réponse :**

### Q4.3 — Format des erreurs
**Proposition :** `{ code, message, details? }`, le même que HAC-API-001.
**Réponse :**

### Q4.4 — Refus d'accès
**Proposition :**
- **404** quand on accède à la ressource d'un autre utilisateur, pour ne pas révéler qu'elle existe ;
- **403** quand le rôle est insuffisant (un USER sur l'admin), avec l'écran « Droits insuffisants » (UX p.11, ACC-ADM-02).

**Réponse :**

### Q4.5 — Faut-il pagination, filtres ou recherche ?
**Proposition :** non. Seulement les parcours P1 à P6 (moins de 20 éléments par liste).
**Réponse :**

---

## 5. Authentification et simulateur

### Q5.1 — Langage du simulateur
**Proposition :** le même que l'API (Rust si Q0.4 = b, sinon TypeScript). Pas d'outil de mock : le CDC demande de « réaliser » le simulateur.
**Réponse :**

### Q5.2 — Comment déclencher le 503 ?
**Proposition :** un fichier drapeau (`auth:down` / `auth:up`), sans redémarrage, plus une variable d'environnement. Ça marche en local ; sur un hébergeur sans accès shell il faudrait autre chose, d'où Q1.3 = local.
**Réponse :**

### Q5.3 — Format du jeton
**Proposition :** opaque (le contrat le dit), en mémoire, expiration après 3600 s.
**Réponse :**

### Q5.4 — Qui appelle le simulateur ?
**Proposition :** uniquement l'API PULSE (BFF). Le front ne le connaît pas.
**Réponse :**

### Q5.5 — Fréquence de vérification de session (`/me`)
**Proposition :** à **chaque** requête, sans cache. Avec un cache, une session continue de fonctionner quelques secondes après `auth:down` ou après la désactivation d'un compte, ce qui brouille la démo REC-04 et doit être expliqué au jury.
**Réponse :**

### Q5.6 — Comment le navigateur garde-t-il la session ?
Options :
- (a) jeton en `sessionStorage`, envoyé en `Authorization: Bearer` : simple, mais exposé au XSS ;
- (b) cookie httpOnly `SameSite=Strict` posé par l'API.

Le cookie (b) ne fonctionne que si le front est servi **par la même origine** que l'API, ce qui suppose Q1.4 = (a). Il faut alors une protection CSRF : vérifier l'en-tête `Origin` et exiger `Content-Type: application/json`.
**Proposition :** (b) avec Q1.4 = (a). C'est plus sûr, et un bon point sécurité à présenter.
**Réponse :**

### Q5.7 — Que se passe-t-il en cours de session ?
Cas à trancher :
- le jeton expire (401 de `/me`) ;
- le service tombe (503) ;
- le service ne répond pas (délai dépassé, connexion refusée) ;
- le compte est désactivé entre-temps (403).

**Proposition :**

| Cas | Comportement |
|---|---|
| 401 | Retour à la connexion avec « Votre session a expiré » |
| 503, délai > 3 s, connexion refusée | Message « service momentanément indisponible », **sans déconnecter** |
| 403 | Déconnexion avec message |

**Réponse :**

### Q5.8 — Réponse du service invalide ou inattendue (ACC-SEC-05, TECH §4.5)
Exemples :
- 200 avec un rôle inconnu ;
- `accountStatus = DISABLED` reçu avec un 200 ;
- `tokenType` différent de `Bearer` ;
- champ manquant ;
- JSON invalide.

**Proposition :** tous ces cas sont traités comme « service indisponible » (503 côté PULSE). La cause est journalisée sans aucune donnée sensible.
**Réponse :**

### Q5.9 — Messages affichés
Les messages du contrat sont en anglais (`Invalid credentials`).
**Proposition :** PULSE affiche ses propres messages en français, choisis selon le `code`, et jamais le texte brut du service.
**Réponse :**

---

## 6. Sécurité et confidentialité

### Q6.1 — Mots de passe de démo dans le simulateur
**Proposition :** hachés en Argon2id (à recalculer : ils sont actuellement en scrypt). Deux réglages techniques nécessaires :
- exécuter le hachage hors du fil principal, pour ne pas bloquer le serveur ;
- l'optimiser même en mode debug, sinon la connexion prend plusieurs secondes et la démo semble figée.

**Réponse :**

### Q6.2 — Protections HTTP
**Proposition :**
- en-têtes de sécurité, CORS restreint, limite de taille des requêtes ;
- **limite de tentatives par adresse IP**, souple et réinitialisable, jamais par e-mail (sinon on révèle qu'un compte existe et on risque de bloquer Alex en démo) ;
- côté Tauri : CSP qui lit l'URL de l'API dans la configuration (pas en dur), permissions natives minimales.

**Réponse :**

### Q6.3 — Journalisation
**Proposition :** logs structurés avec méthode, route, statut, durée et identifiant de corrélation. Jamais de corps de requête, de jeton ni de donnée personnelle.
**Réponse :**

### Q6.4 — Indicateurs agrégés pour l'employeur
**Proposition :** hors V1, mentionné dans les recommandations V2.
**Réponse :**

### Q6.5 — Vérifications de sécurité automatiques
**Proposition :**
- `cargo-deny` (failles connues et licences) et `pnpm audit` ;
- scan de secrets ;
- tests d'autorisation : un USER sur l'admin, l'identifiant d'un autre utilisateur, un double clic sur « Rejoindre ».

**Réponse :**

---

## 7. Données et règles métier

### Q7.1 — Stockage de PULSE V1
Options :
- (a) en mémoire + sauvegarde dans un fichier JSON, comme aujourd'hui ;
- (b) SQLite via `rusqlite` ou `sqlx`, **sans** les macros vérifiées à la compilation ;
- (c) SQLite via `sqlx` **avec** ces macros : il faut une base ou un dossier `.sqlx` versionné pour compiler, ce qui est piégeux pour reproduire l'environnement.

Le CDC exclut la conception de la persistance cible : elle relève de la V2.
**Proposition :** (a) derrière le trait `Store`. La V2 branchera PostgreSQL derrière le même trait, et l'argument est simple à présenter.
**Réponse :**

### Q7.2 — Les données doivent-elles survivre à un redémarrage ?
ACC-PREF-04 exige seulement qu'une modification « reste visible après rafraîchissement ».
**Proposition :** oui (fichier JSON), et une commande `reset` recharge HAC-DATA-001 avant chaque démo. On réutilise le `seed.json` déjà converti.
**Réponse :**

### Q7.3 — Rejoindre un défi après l'avoir quitté
**Proposition :** une nouvelle participation, pour garder l'historique.
**Réponse :**

### Q7.4 — Réactiver un objectif suspendu (RG-GOAL-06)
**Proposition :** oui. CLOSED reste définitif.
**Réponse :**

### Q7.5 — Progression d'un défi
ACC-CHAL-08 demande seulement de la **consulter**, et PROD §7 interdit d'ajouter du non-demandé au détriment des MUST.
**Proposition :** lecture seule, valeur issue du seed. L'ambiguïté est signalée dans L1.
**Réponse :**

### Q7.6 — Statut d'un défi : saisi ou calculé ?
**Proposition :** saisi par l'admin. **Aucun statut n'est calculé à partir de la date du jour** : les données datent de février 2026, la soutenance a lieu en novembre 2026.
**Réponse :**

### Q7.7 — Préférence « participer aux défis = non »
**Proposition :** n'empêche pas l'inscription ; c'est une préférence d'affichage. Ambiguïté signalée dans L1.
**Réponse :**

### Q7.8 — Cas limites des transitions
- Peut-on mettre à jour la progression d'un objectif **SUSPENDED** ?
- Peut-on **quitter** un défi CLOSED, ou une participation COMPLETED ?
- **Qui** fait passer une participation à COMPLETED ?

**Proposition :** non ; non ; personne en V1 (COMPLETED vient seulement du seed).
**Réponse :**

### Q7.9 — Admin et défis
- Un défi CLOSED est-il en lecture seule côté admin ? (UX p.10 affiche « Consulter » au lieu de « Modifier ».)
- Que deviennent les participations actives quand l'admin ferme un défi ?
- L'admin voit-il un nombre de participants, ou rien ?

**Proposition :** CLOSED en lecture seule ; les participations restent telles quelles ; l'admin ne voit **ni noms ni nombre** (RG-ADM-06).
**Réponse :**

### Q7.10 — Une seule participation active par défi (ACC-CHAL-05)
**Proposition :** la règle est vérifiée dans le domaine **et** le bouton est désactivé pendant l'envoi. Un test simule un double clic.
**Réponse :**

### Q7.11 — Gestion des contenus (SHOULD, ACC-ADM-07)
Faite ou non ? La décision est tracée dans L2.
**Proposition :** faite seulement si F1–F6 sont validés en recette avant la séance n−1.
**Réponse :**

---

## 8. Interface, UX et accessibilité

### Q8.1 — Référence visuelle
**Proposition :** les écrans HAC-UX-001 sont la référence imposée. Le Figma n'est pas utilisé pour le code (décision D-18) : refaire des maquettes est hors périmètre (CDC §6).
**Réponse :**

### Q8.2 — Niveau d'accessibilité
**Proposition :** WCAG 2.1 AA sur les parcours de la démo, vérifié avec axe ou Lighthouse. Les résultats vont dans L6.
**Réponse :**

### Q8.3 — Tutoiement ou vouvoiement ?
**Proposition :** vouvoiement, comme dans UX.
**Réponse :**

### Q8.4 — Composants d'interface
**Proposition :** CSS maison avec des variables de couleur et d'espacement (l'existant). Pas de bibliothèque supplémentaire.
**Réponse :**

---

## 9. Hébergement, environnements et distribution

### Q9.1 — Environnements
**Proposition :** uniquement `local`. Pas de production : le CDC l'exclut.
**Réponse :**

### Q9.2 — Faut-il héberger quelque chose en ligne ?
Points à peser :
- le simulateur et l'API font deux services ;
- le disque des hébergeurs gratuits est éphémère ;
- le fichier drapeau du 503 n'est pas pilotable sans accès shell ;
- l'URL publique exposerait les mots de passe de démo.

**Proposition :** non. Démo locale + vidéo de secours. On cite l'hébergement dans les recommandations V3.
**Réponse :**

### Q9.3 — Docker
**Proposition :** non. Un build Rust en Docker est long (et émulé sur Mac Apple Silicon), et le jury ne l'évalue pas (ACC §13). Le README suffit à reproduire l'environnement.
**Réponse :**

### Q9.4 — Distribution du desktop Tauri
Sans signature de code :
- macOS affiche « app endommagée » (il faut `xattr -cr`) ;
- Windows affiche SmartScreen et demande WebView2 sur Windows 10.

**Proposition :** pas d'installeur distribué. L'app se lance depuis le dépôt (`pnpm dev:desktop`) sur vos postes. La limite est documentée.
**Réponse :**

### Q9.5 — CI GitHub (bloquée par la facturation de ton compte)
Options :
- régler la facturation ;
- créer une organisation GitHub d'équipe gratuite et y transférer le repo ;
- utiliser des **hooks Git locaux** (tests et lint avant chaque push) en attendant.

**Réponse :**

---

## 10. Qualité

### Q10.1 — Traçabilité
**Proposition :**
- chaque spec cite ses règles (RG) et ses critères (ACC) ;
- chaque test porte l'identifiant qu'il vérifie (`ACC-GOAL-04`) ;
- `spec/traceability.md` relie règle → spec → code → test → scénario de recette.

**Réponse :**

### Q10.2 — Niveaux de tests
**Proposition :**
- tests unitaires du domaine ;
- tests d'intégration de l'API avec le vrai simulateur, démarré dans le test ;
- E2E Playwright des 13 scénarios REC dans le navigateur.

Pas d'E2E sur Tauri : `tauri-driver` n'existe pas pour macOS.
**Réponse :**

### Q10.3 — Couverture
**Proposition :** chaque ACC et chaque REC couvert par au moins un test. Pas d'objectif en pourcentage de lignes.
**Réponse :**

### Q10.4 — Branches, commits, revues
**Proposition :**
- `main` protégée, branches `feat/<id-carte>` ;
- Conventional Commits ;
- une revue obligatoire par un autre membre ;
- pas de ligne « co-auteur IA » dans les commits (votre décision) ;
- l'usage de l'IA est **déclaré** dans L5, comme le CDC §9 l'attend.

**Réponse :**

### Q10.5 — Définition de « terminé »
**Proposition :** spec à jour, règle appliquée côté serveur, test qui référence l'ACC, revue faite, vérifications locales ou CI vertes, démo possible.
**Réponse :**

### Q10.6 — Réutiliser les 48 tests TypeScript comme filet
**Proposition :** on les transforme en tests « boîte noire » qui appellent une URL. La même suite vérifie alors l'API TypeScript **et** l'API Rust : tant qu'elle n'est pas verte sur Rust, on livre la version TypeScript.
**Réponse :**

### Q10.7 — Registre des anomalies
Où les consigner, et avec quelle gravité ? Le CDC §5.6 définit une anomalie critique comme une anomalie qui bloque un REC ou viole §4.1 ou §4.5.
**Proposition :** une étiquette « Anomalie » + « Critique » sur Trello, recopiée dans L6.
**Réponse :**

---

## 11. Organisation de l'équipe

### Q11.1 — Rôles
Qui est PO (contact Produit), pilote / Scrum Master, référent technique, référent qualité-recette ?
**Réponse :**

### Q11.2 — Découpage du travail
**Proposition :** par domaine, de bout en bout : chacun fait spec, API, écran et tests de son domaine. C'est l'actuel Trello :
- Grégory : F1 et sécurité ;
- Maxime : F2 et F3 ;
- Simon : F4 et F5 ;
- Mael : socle, F6 et démo.

**Réponse :**

### Q11.3 — Calendrier
Combien de séances, de quelle durée, et quelle date de soutenance ? C'est ce qui fixe les sprints et le point de décision du plan B (Q14.2).
**Réponse :**

### Q11.4 — Rituels
**Proposition :**
- 10 min de point au début de chaque séance ;
- 15 min de revue en fin de sprint ;
- décisions tracées dans `spec/decisions/` sous forme d'ADR.

**Réponse :**

### Q11.5 — Trello
**Proposition :** on garde 5 colonnes et une étiquette par sprint. Les cartes sont regénérées depuis `spec/*/tasks.md`, avec un lien vers la spec.
**Réponse :**

### Q11.6 — Règle d'usage de l'IA
**Proposition :** l'IA génère à partir des specs. Chaque morceau est relu par un humain capable de l'expliquer. L'usage est déclaré dans L5.
**Réponse :**

### Q11.7 — Auteurs des commits
Le jury lit l'historique (L3) et interroge chacun.
**Proposition :** chaque membre est l'auteur des commits de son domaine (pas un seul compte qui pousse tout).
**Réponse :**

---

## 12. Outils

### Q12.1 — Outils retenus
**Proposition :**

| Besoin | Outil |
|---|---|
| Code | GitHub |
| Suivi | Trello |
| Specs | Markdown + OpenAPI dans le repo |
| Diagrammes | Mermaid |
| Recette | Playwright + captures |
| Support de soutenance | à choisir |
| Communication | à choisir |

Quels outils utilisez-vous déjà ?
**Réponse :**

### Q12.2 — Structure Spec Driven
**Proposition :** inspirée de GitHub Spec Kit, en Markdown, sans dépendre d'un outil :
- `spec/constitution.md` : principes non négociables ;
- `spec/architecture.md` + `spec/decisions/` (ADR) ;
- `spec/features/<F1…F6>/spec.md`, `plan.md` et `tasks.md` ;
- `spec/api/` : contrats.

**Réponse :**

---

## 13. Livrables et soutenance

### Q13.1 — Format des livrables L1 à L8
**Proposition :**
- L1 et L2 dans un seul document (5 pages maximum) ;
- L5 dans le README et `spec/` ;
- L6 à part ;
- L7 et L8 dans le support de soutenance.

Tout en Markdown exporté en PDF.
**Réponse :**

### Q13.2 — Démo
**Proposition :**
- démo live dans le navigateur ;
- 401 **et** 503 en direct ;
- test responsive sur smartphone ;
- Tauri à la fin s'il est prêt ;
- vidéo de secours ;
- un pilote différent par partie.

**Réponse :**

### Q13.3 — Répartition des 20 minutes
**Proposition :**

| Durée | Contenu |
|---|---|
| 2 min | Contexte |
| 2 min | Démarche et organisation |
| 7 min | Démo |
| 3 min | Choix techniques et sécurité |
| 2 min | Recette et anomalies connues |
| 2 min | Difficultés, arbitrages et limites |
| 2 min | Recommandations V2 |

Chaque membre parle au moins 4 minutes.
**Réponse :**

---

## 14. Risques

### Q14.1 — Risques que vous voyez
Absences, machines, connaissances, temps, autre.
**Réponse :**

### Q14.2 — Plan B si le Rust prend du retard
**Proposition :** un point de décision **daté**, à la fin de la séance 2, avec un critère mesurable : REC-01 à REC-05 passent sur l'API Rust (suite de Q10.6). Sinon, on livre l'API TypeScript et Tauri reste une simple coque.
**Réponse :**

### Q14.3 — Autre chose ?
Consignes du formateur, contraintes de l'école, éléments reçus en dehors du dossier.
**Réponse :**
