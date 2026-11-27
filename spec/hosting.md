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

## En ligne : Railway (ADR-17)

Un projet `pulse` avec 3 services :

| Service | Build | Accès |
|---|---|---|
| `pulse-api` | Railpack : `pnpm --dir apps/web build` puis `cargo build --release -p pulse-api` ; le binaire sert `apps/web/dist` | Domaine public `*.up.railway.app`, HTTPS |
| `auth-simulator` | Railpack : `cargo build --release -p auth-simulator` | **Réseau privé uniquement** : `http://auth-simulator.railway.internal:8081` |
| `postgres` | Base gérée par Railway | Réseau privé |

- **Déploiement** : automatique à chaque push sur `main`. Les migrations s'appliquent au démarrage de `pulse-api`.
- **Variables d'environnement** : celles de `architecture.md` → Configuration. `AUTH_SIM_CONTROL_TOKEN` et `DATABASE_URL` ne sont saisis que dans Railway.
- **503 en ligne** : le simulateur n'est pas public, et `railway run` s'exécute sur le poste local, pas dans le réseau privé. `make auth-down-remote` passe donc par `railway ssh --service auth-simulator`, puis appelle `POST /__control/availability` sur `localhost`. L'effet est immédiat. En secours : variable `AUTH_SIM_UNAVAILABLE=true`, qui redéploie le service en environ 20 s.
- **Remise à zéro avant la démo** : `make seed-remote` lance le seed depuis le poste, avec l'URL **publique** de la base (`DATABASE_PUBLIC_URL`, injectée par `railway run`).
- **Plan** :
  - Free pendant le développement. Les services s'endorment après 5 à 10 min sans trafic, et le premier appel les réveille.
  - **Hobby (5 $) le mois de la soutenance**, pour éviter la mise en veille.
  - Si le build Rust dépasse les ressources du plan Free, on passe en Hobby plus tôt.
- **Repli** : si Railpack ne sait pas compiler le front et le Rust ensemble, on ajoute un `Dockerfile` réservé au build Railway (écart à ADR-18, à consigner dans `decisions.md`).

## App desktop Tauri

- macOS uniquement (vos postes et la machine de démo).
- La fenêtre charge `PULSE_URL` : en local ou sur Railway. Aucune commande Rust n'est exposée, et la capability ne donne aucune permission native à l'URL distante.
- Pas d'installeur distribué : on la lance depuis le dépôt (`make desktop`), ou on la compile (`.app` non signé). La limite est documentée dans L5.

## Démo

1. La veille : passer Railway en Hobby, `make seed-remote`, ouvrir l'URL une fois pour réveiller les services.
2. Montrer la version en ligne en priorité. En secours : `make dev` en local + la vidéo de secours.
