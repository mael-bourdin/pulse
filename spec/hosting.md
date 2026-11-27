# Hébergement et environnements

Responsable : **Mael**.

## Local (chaque poste, macOS)

Prérequis :
- Rust (version de `rust-toolchain.toml`, via rustup) ;
- Node 22 + pnpm ;
- PostgreSQL 16 (Postgres.app ou `brew install postgresql@16`) ;
- pour le desktop : Xcode Command Line Tools.

Pas de Docker (ADR-18).

```bash
cp .env.example .env
make setup      # crée la base, applique les migrations, installe le front
make seed       # charge HAC-DATA-001
make dev        # simulateur :8081 + API :8080 + Vite :5173 (proxy /api → 8080)
make auth-down  # 503 sur le simulateur local ; make auth-up pour rétablir
make desktop    # app Tauri qui charge PULSE_URL (http://localhost:5173 en dev)
```

## En ligne : Railway + Neon (ADR-17, ADR-30, ADR-35)

Un projet Railway `pulse`, un environnement `production` de 2 services, et une base PostgreSQL 16 sur Neon. `production` désigne la **version livrée** de PULSE V1, celle de la revue de version et de la soutenance (L4) : aucun vrai utilisateur, aucune donnée réelle. Au sens du dossier, c'est un **environnement de recette** : HAC-ACC-001 (ACC-SEC-02) n'autorise les mots de passe de démo qu'« en développement et en recette », et HAC-API-001 §1 parle d'« environnements de développement et de recette ».

On s'arrête au **déploiement natif de Railway** : Railway lit GitHub et déploie `main` une fois la CI verte. La CI ne déploie rien et n'a aucun jeton Railway, ce qui nous garde hors de « la construction d'un pipeline CI/CD de mise en production », exclue de V1 (TECH §5, CDC §6).

### Projet

Projet Railway **`pulse`** créé le 2026-11-25 (ID `915d0dc6-b726-4e97-b66a-28647d0f0eaa`), **aucun service pour l'instant**. Il est dans l'espace de Maxime, en essai jusqu'au 2026-12-25 environ. Sur le plan Free, un projet n'a qu'**un membre** : celui qui le possède est le seul à voir les journaux et à faire le 503 en ligne. Où le projet doit vivre (espace de Mael ou de Maxime) est à trancher en équipe (Q14.2).

Les réglages Railway se font dans le **tableau de bord**, et **ce fichier en est la référence** : un réglage change d'abord ici, par PR. Les fichiers `railway.json` / `railway.toml` ne sont pas utilisés : Railway les a dépréciés et ne les lira plus à partir du 2026-12-01.

### Services

| Service | Build | Réseau | Chemins surveillés |
|---|---|---|---|
| `pulse-api` | Railpack, voir ci-dessous. Pré-déploiement : `pulse-api migrate`. Healthcheck : `/health`, délai 60 s | Domaine public `*.up.railway.app`, HTTPS ; sert l'API et le site React compilé | `/crates/pulse-api/**`, `/crates/pulse-domain/**`, `/apps/web/**`, `/migrations/**`, `/data/**`, `/Cargo.toml`, `/Cargo.lock`, `/rust-toolchain.toml` |
| `auth-simulator` | Railpack, `RAILPACK_CARGO_WORKSPACE=auth-simulator` | **Réseau privé uniquement** : `http://auth-simulator.railway.internal:8081` | `/crates/auth-simulator/**`, `/Cargo.toml`, `/Cargo.lock`, `/rust-toolchain.toml` |
| Base | **Neon**, projet `pulse-production`, PostgreSQL 16, hors Railway | Internet, TLS obligatoire, mot de passe fort | — |

Les chemins surveillés évitent de redéployer quand seule la spec ou la doc change.

**Build de `pulse-api`** : Railpack choisit le langage Rust et ne compile pas le front tout seul. Réglages à tester en S0, **pendant 30 minutes au plus** :
- `RAILPACK_CARGO_WORKSPACE=pulse-api` (sinon Railpack prend le premier binaire du workspace) ;
- `RAILPACK_PACKAGES="node@22 pnpm"` pour disposer de Node ;
- commande de build : `pnpm --dir apps/web install --frozen-lockfile && pnpm --dir apps/web build && cargo build --release -p pulse-api`.

Si cette combinaison échoue dans le temps imparti, on ajoute `crates/pulse-api/Dockerfile` en plusieurs étapes, utilisé **uniquement** par Railway. Personne n'installe Docker sur son poste : ADR-18 tient, et l'écart est consigné dans [decisions.md](decisions.md). Rien ne se connecte à la base pendant la compilation : les requêtes sqlx sont vérifiées à l'exécution (ADR-13).

### Variables

La syntaxe `${{service.VARIABLE}}` est une référence Railway, résolue au déploiement.

| Service | Variable | Valeur |
|---|---|---|
| `pulse-api` | `DATABASE_URL` | chaîne de connexion **directe** du projet Neon (sans `-pooler` : sqlx gère son propre pool, et les migrations exigent une connexion directe), avec `sslmode=require`. Variable scellée |
| | `AUTH_SERVICE_URL` | `http://${{auth-simulator.RAILWAY_PRIVATE_DOMAIN}}:${{auth-simulator.AUTH_SIM_PORT}}` |
| | `ALLOWED_ORIGINS` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| | `COOKIE_SECURE`, `TRUST_PROXY` | `true` |
| | `LOGIN_RATE_LIMIT_PER_MIN` | `5` |
| | `AUTH_TIMEOUT_MS` | `3000` |
| | `RUST_LOG` | `info` |
| | `PORT` | injectée par Railway, ne pas la définir |
| `auth-simulator` | `AUTH_SIM_PORT` | `8081` |
| | `AUTH_SIM_CONTROL_TOKEN` | secret aléatoire (`openssl rand -hex 32`), **variable scellée** |
| | `AUTH_SIM_UNAVAILABLE` | `false` |
| | `AUTH_SIM_TOKEN_TTL` | `3600` |
| | `RUST_LOG` | `info` |

Une variable scellée n'est plus lisible, ni dans l'interface, ni par `railway run`, et n'est pas copiée si on duplique l'environnement.

**Mise en veille** : sur le plan Free, Railway endort un service sans trafic **sortant** depuis 10 min. Une connexion ouverte vers Neon l'en empêcherait (et consommerait le crédit), donc le pool sqlx garde **0 connexion au repos** ([architecture.md](architecture.md) → Configuration). Neon s'endort de lui-même après 5 min et se réveille en quelques centaines de millisecondes.

### Déploiement

- Automatique quand `main` reçoit une fusion, **après** la CI verte : option « Wait for CI » activée sur les deux services. Le déploiement attend la fin des workflows GitHub Actions du commit ; un workflow en échec l'annule, un job sauté ne bloque pas. Mael accepte la mise à jour des permissions de l'application GitHub de Railway.
- **Migrations** : lancées par la commande de pré-déploiement `pulse-api migrate`, avant la nouvelle version. Si elle échoue, le déploiement est annulé et l'ancienne version reste en ligne (ADR-31). Une migration fusionnée n'est **jamais** modifiée (sqlx vérifie leur somme de contrôle) : on en ajoute une nouvelle. À partir de la première démo en ligne, migrations **additives** seulement, car le retour arrière Railway ne défait pas une migration. Noms : `migrations/<AAAAMMJJHHMM>_<sujet>.sql`.
- **Healthcheck** : `GET /health` (hors `/api/v1`) répond `200 { "status": "ok", "version": "0.2.0", "commit": "<sha court>" }`, le commit venant de `RAILWAY_GIT_COMMIT_SHA` (`local` sur un poste). Il exécute `SELECT 1` (503 si la base ne répond pas) mais **n'appelle jamais le service d'auth** : sinon, une démonstration du 503 bloquerait les déploiements. Railway ne bascule le trafic qu'une fois `/health` en 2xx. Ce n'est pas de la supervision.
- **Retour arrière** : Railway → service → Deployments → Rollback, sans recompiler, tant que l'image est conservée (24 h sur Free). Ensuite : « Revert » sur la PR fautive, en PR vers `main`.

### Données et 503

- **Remise à zéro** : `make seed-remote` lance `pulse-api seed --reset` depuis le poste, avec la chaîne de connexion Neon lue dans `.env.production` (ignoré par Git, copié depuis la console Neon). Tous les membres de l'organisation Neon peuvent le faire. Le seed n'est **jamais** lancé par un déploiement. Pas de sauvegarde : restaurer, c'est relancer le seed (ADR-32).
- **503 en ligne** : le simulateur n'est pas public, et `railway run` s'exécute sur le poste local. `make auth-down-remote` passe donc par `railway ssh --service auth-simulator`, puis appelle `POST /__control/availability` sur `localhost`. L'effet est immédiat. En secours : variable `AUTH_SIM_UNAVAILABLE=true`, qui redéploie le service en environ 20 s.

### Plan et coût

Gratuit pendant le développement : Railway Free pour les deux services, Neon Free pour la base (ADR-35).

| Contrainte du plan gratuit | Conséquence | Parade |
|---|---|---|
| Railway Free : mise en veille **forcée** | Premier appel lent, parfois une 502 au réveil | Pool sqlx à 0 connexion au repos ; **chauffe** 2 min avant chaque démo |
| Railway Free : **1 $** de crédit par mois | Services arrêtés jusqu'au mois suivant si on le dépasse | Services endormis la plupart du temps ; surveiller l'usage chaque semaine |
| Railway Free : build de **10 min** | Le build Rust release peut dépasser | Cache Railpack ; sinon passer en Hobby plus tôt |
| Railway Free : **1 membre** par projet | Une seule personne voit les journaux et fait le 503 en ligne : point unique de défaillance le jour de la soutenance | Q14.2 ; Neon accepte toute l'équipe, donc tout le monde peut lancer un seed |
| Railway Free : 1 volume par projet | Une base Railway serait vue par un seul membre et consommerait le crédit | Base sur **Neon Free** : 0,5 Go, mise en veille après 5 min, sans limite de durée ni carte |

**Hobby (5 $) le mois de la soutenance** reste l'option d'ADR-17 : pas de mise en veille, donc pas de 502 au réveil devant le jury, et plus de ressources de build. À trancher en équipe (Q14.9).

Exclus : Render pour la base (PostgreSQL gratuit supprimé au bout de 30 jours), Supabase (pause après 7 jours d'inactivité), Fly.io et Koyeb (carte exigée). Dernier recours si Railway devenait inutilisable : auto-hébergement Oracle Cloud Always Free + Dokploy (carte exigée, 4 à 8 h de mise en place, administration).

### Mise en place

1. Mael installe l'application GitHub de Railway sur `mael-bourdin/pulse` (seul le propriétaire du dépôt peut le faire) et accepte ses permissions.
2. Création de l'organisation Neon `pulse` et du projet `pulse-production` en PostgreSQL 16 ; les quatre membres sont invités.
3. Dès que le socle Rust est dans `main` : créer `auth-simulator` puis `pulse-api` depuis le dépôt, branche `main`, avec les variables, chemins surveillés, pré-déploiement, healthcheck, « Wait for CI » et le domaine public de `pulse-api`. Avant, il n'y a rien d'utile à déployer.
4. Seed, puis vérifier : `/health`, connexion d'Alex, un 401, le 503 avec `make auth-down-remote`. Noter l'URL dans le README.

## App desktop Tauri

- macOS uniquement (vos postes et la machine de démo).
- La fenêtre charge `PULSE_URL` : en local ou sur Railway. Aucune commande Rust n'est exposée, et la capability ne donne aucune permission native à l'URL distante.
- Pas d'installeur distribué : on la lance depuis le dépôt (`make desktop`), ou on la compile (`.app` non signé). La limite est documentée dans L5.

## Démo

1. La veille : vérifier que le crédit Railway du mois n'est pas épuisé, `make seed-remote`, contrôler `/health` (bon commit), faire le parcours de démo une fois en entier.
2. Le jour J, **2 min avant** (inutile en Hobby) : ouvrir le site et se connecter une fois avec Alex, pour réveiller l'API, le simulateur et la base.
3. Montrer la version en ligne en priorité. En secours : `make dev` en local, puis la vidéo de secours.
