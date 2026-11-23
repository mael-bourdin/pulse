# PULSE V1 – Coach & Challenges

Premier incrément du programme PULSE de HealthAI Coach (MSPR TPRE501, bloc 1 CDA).
Application **web responsive** (ordinateur, tablette, smartphone), avec en option une **coque desktop Tauri** qui embarque la même interface.

| Composant | Dossier | Rôle | Port |
|---|---|---|---|
| Simulateur d'authentification | `apps/auth-simulator` | Implémente le contrat **HAC-API-001** (`/api/v1/auth/login`, `/api/v1/auth/me`) avec les utilisateurs HAC-DATA-001 | 4001 |
| API PULSE | `apps/api` | Règles métier F2–F6, contrôle des droits, stockage JSON. Seul consommateur du service d'auth | 4000 |
| Front web | `apps/web` | React + Vite, interfaces HAC-UX-001 | 5173 |
| Coque desktop (option) | `apps/desktop` | Tauri v2, affiche le front web | – |
| Référentiels partagés | `packages/shared` | Enums métier, types, schémas de validation (zod) | – |

```
Navigateur / Tauri ──HTTP──▶ API PULSE ──HTTP (contrat HAC-API-001)──▶ Simulateur d'auth
   (apps/web)               (apps/api)                                (apps/auth-simulator)
                               │
                               └── data/store.json (créé depuis data/seed.json = HAC-DATA-001)
```

Le front ne parle **qu'à l'API PULSE**. L'API est la seule à appeler le service d'authentification, via un client unique : `apps/api/src/integrations/auth/`. Pour brancher le vrai service, il suffit de changer `AUTH_SERVICE_URL`.

## Prérequis

- **Node.js 22+** et **pnpm 10** (`corepack enable` suffit, la version est fixée dans `package.json`).
- *(Optionnel, version desktop)* **Rust stable** (`curl https://sh.rustup.rs -sSf | sh`) et les [prérequis Tauri](https://tauri.app/start/prerequisites/) de votre OS.

## Installation et lancement

```bash
corepack enable
pnpm install
cp .env.example .env        # configuration locale, aucun secret
pnpm dev                    # lance simulateur (4001) + API (4000) + web (5173)
```

Ouvrir http://localhost:5173.

Lancer séparément : `pnpm dev:auth`, `pnpm dev:api`, `pnpm dev:web`.
Version desktop : `pnpm dev:desktop` (nécessite Rust ; lancer aussi `pnpm dev:auth` et `pnpm dev:api`).

### Comptes de démonstration (HAC-DATA-001, données fictives)

| Compte | Mot de passe | Rôle / état | Scénario |
|---|---|---|---|
| alex.martin@demo.healthaicoach.fr | `DemoPassword!` | USER, ACTIVE | REC-01, 05–10, 12 |
| samira.benali@demo.healthaicoach.fr | `DemoPassword!` | USER, ACTIVE | – |
| thomas.roy@demo.healthaicoach.fr | `DemoPassword!` | USER, **DISABLED** | REC-03 (403) |
| lea.bernard@demo.healthaicoach.fr | `AdminDemo!` | FUNCTIONAL_ADMIN | REC-11, 13 |

Ce sont des identifiants de démonstration fournis par le dossier projet. Le simulateur ne les stocke qu'**hachés (scrypt)** dans `apps/auth-simulator/data/users.json` et ne les renvoie jamais.

### Simuler l'indisponibilité du service d'auth (503, REC-04)

```bash
pnpm auth:down   # crée apps/auth-simulator/data/.unavailable → toutes les requêtes /api/v1/auth/* renvoient 503
pnpm auth:up     # supprime le drapeau → service rétabli
```

Le changement est immédiat, sans redémarrage. Autre méthode : lancer le simulateur avec `AUTH_SIM_FORCE_UNAVAILABLE=true`.
Pour l'API PULSE, une indisponibilité (503, délai dépassé, service éteint, réponse non conforme) produit toujours le message « service momentanément indisponible », jamais « identifiants incorrects » (RG-AUTH-06).

### Réinitialiser les données

```bash
pnpm db:reset    # supprime apps/api/data/store.json ; il est recréé depuis seed.json au prochain démarrage de l'API
```

## Vérifications

```bash
pnpm test            # 17 tests de conformité du simulateur + 31 tests d'intégration API (sur un vrai simulateur HTTP)
pnpm typecheck
pnpm check:secrets   # absence de secrets dans les fichiers suivis
pnpm build
```

La CI GitHub (`.github/workflows/ci.yml`) exécute les mêmes vérifications à chaque push et à chaque PR.

## Conventions d'équipe

- **Branches** : `main` toujours démontrable et protégée. Travail sur `feat/<id-carte>-court-libelle` (ex. `feat/US-GOAL-02-creer-objectif`), `fix/...`, `docs/...`.
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/fr/) avec la clé du ticket, par exemple `feat(goals): suspendre un objectif [US-GOAL-04]`.
- **Commits sans co-auteur IA** : le hook `.githooks/commit-msg` (activé par `pnpm install`) retire les lignes `Co-Authored-By` d’assistants IA.
- **Revue** : toute PR vers `main` est relue par au moins un autre membre et la CI doit passer. Checklist : règle métier citée (RG-…), droits vérifiés côté API, aucune donnée réelle ni secret.
- **Code** : TypeScript strict, 2 espaces, LF. Validation des entrées dans `packages/shared/src/schemas.ts`, règles métier dans `apps/api/src/domain/`, une route ne contient pas de logique métier.
- **Répartition** : Grégory = authentification et sécurité (F1) ; Maxime = préférences et objectifs (F2, F3) ; Simon = défis et progression (F4, F5) ; Mael = socle, administration (F6), démo. Recette et revue croisée : tous.
- **Backlog** : `docs/backlog/backlog-operationnel.csv` (source du tableau Trello : https://trello.com/b/Ed35xHmf/mspr).

## Où trouver quoi

| Sujet | Emplacement |
|---|---|
| Intégration du service d'auth (zone unique) | `apps/api/src/integrations/auth/` |
| Vérification de session (`/me`) et contrôle de rôle | `apps/api/src/http/session.ts` |
| Règles métier | `apps/api/src/domain/*.ts` |
| Validation des entrées | `packages/shared/src/schemas.ts` |
| Simulateur HAC-API-001 | `apps/auth-simulator/src/app.ts` |
| Décisions et hypothèses | `docs/decisions.md` |
| Recette | `docs/recette.md` |
| Maquettes Figma | https://www.figma.com/design/56cn1gPfEJSQqI6xDowlo1/MSPR |
