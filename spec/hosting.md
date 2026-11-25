# Hébergement et environnements

Responsables : **Mael** (environnement local), **Maxime** (Railway et Neon).

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

## En ligne : Railway + Neon, gratuit (ADR-17, ADR-30, ADR-35)

Un projet Railway `pulse`, **deux environnements** de 2 services chacun, et une base Neon par environnement. Les deux sont des environnements de **recette** au sens d'ACC-SEC-02 (données et comptes de démo uniquement) ; `production` est la version livrée, montrée en revue de version. Le détail des réglages (build, variables, migrations, healthcheck, plan) est dans [ci-cd.md](ci-cd.md) → Déploiement.

| Environnement | Déployé depuis | Usage |
|---|---|---|
| `production` | `main`, après CI verte | Démo du jury, soutenance (L4) |
| `staging` | `develop`, après CI verte | Recette, démos internes |

| Service | Accès |
|---|---|
| `pulse-api` | Domaine public `*.up.railway.app`, HTTPS ; sert l'API et le site React compilé |
| `auth-simulator` | **Réseau privé uniquement** : `http://auth-simulator.railway.internal:8081` |
| Base PostgreSQL 16 | **Neon** (`pulse-production`, `pulse-staging`), hors Railway : connexion TLS avec mot de passe |

- **Déploiement** : automatique quand `main` ou `develop` reçoit une fusion, **après** la CI verte (« Wait for CI »). Les migrations passent en pré-déploiement (ADR-31).
- **Variables** : voir [ci-cd.md](ci-cd.md) → Variables. `AUTH_SIM_CONTROL_TOKEN` (scellée, une par environnement) et `DATABASE_URL` n'existent que dans Railway.
- **503 en ligne** : le simulateur n'est pas public, et `railway run` s'exécute sur le poste local, pas dans le réseau privé. `make auth-down-remote ENV=staging|production` passe donc par `railway ssh --service auth-simulator --environment <env>`, puis appelle `POST /__control/availability` sur `localhost`. L'effet est immédiat. En secours : variable `AUTH_SIM_UNAVAILABLE=true`, qui redéploie le service en environ 20 s.
- **Remise à zéro** : `make seed-remote ENV=staging|production` lance `pulse-api seed --reset` depuis le poste, avec la chaîne de connexion Neon de l'environnement, lue dans `.env.staging` ou `.env.production` (ignorés par Git, copiés depuis la console Neon). Tout membre de l'organisation Neon peut le faire.
- **Plan** : **gratuit**. Railway Free (mise en veille forcée, 1 $ de crédit par mois, build de 10 min, un seul membre) et Neon Free. Limites, risque sur le nombre de services et replis : [ci-cd.md](ci-cd.md) → Plan et coût.
- **Build** : Railpack ; si la compilation conjointe du front et du Rust échoue en S0, `Dockerfile` réservé à Railway ([ci-cd.md](ci-cd.md) → Services).

## App desktop Tauri

- macOS uniquement (vos postes et la machine de démo).
- La fenêtre charge `PULSE_URL` : en local ou sur Railway. Aucune commande Rust n'est exposée, et la capability ne donne aucune permission native à l'URL distante.
- Pas d'installeur distribué : on la lance depuis le dépôt (`make desktop`), ou on la compile (`.app` non signé). La limite est documentée dans L5.

## Démo

1. J-2 : gel de `main`, release `v1.0.0` ([workflow.md](workflow.md) → Release).
2. La veille : vérifier que le crédit Railway du mois n'est pas épuisé, `make seed-remote ENV=production`, contrôler `/health` (commit de `v1.0.0`), faire le parcours de démo une fois en entier.
3. Le jour J, **2 min avant** : ouvrir le site et se connecter une fois avec Alex, pour réveiller l'API, le simulateur et la base (plan gratuit). Montrer `production` en priorité. En secours : `staging` (même version), puis `make dev` en local, puis la vidéo de secours.
