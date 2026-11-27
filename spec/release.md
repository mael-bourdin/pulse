# Releases, environnement `staging` et E2E vers `main`

**Proposition à trancher en séance (Q14.1), priorité COULD.** Elle complète [workflow.md](workflow.md) et [hosting.md](hosting.md) sans les remplacer : si elle est refusée, la promotion `develop` → `main` reste la simple PR de fin de sprint de workflow.md, et l'hébergement reste un seul environnement. Décisions : ADR-36, ADR-37.

Ce que ça apporte : des numéros de version et un changelog produits sans effort à partir des titres Angular (revue de version tracée, CDC §8, API §9), une recette en ligne sur `develop` sans toucher à la démo du jury, et les E2E rejoués avant chaque livraison. Ce que ça coûte : **2 à 3 h** en S0 (application GitHub, second environnement, réglages), puis environ 15 min par fin de sprint. C'est de l'outillage d'équipe, pas un livrable (ACC §13).

## Environnement `staging`

Un second environnement dans le projet Railway `pulse`, réglé comme `production` ([hosting.md](hosting.md)), à ces différences près :

| | `production` | `staging` |
|---|---|---|
| Branche qui déclenche le déploiement | `main` | `develop` |
| Usage | Démo du jury (L4), soutenance | Vérification des cartes en revue, démos de fin de sprint |
| Base | Neon `pulse-production` | Neon `pulse-staging` (second projet de la même organisation) |
| Données | Seed avant chaque démo, sinon on n'y touche pas | Seed à volonté : `make seed-remote ENV=staging` (chaîne lue dans `.env.staging`) |
| `AUTH_SIM_CONTROL_TOKEN` | Le sien | Le sien, différent (une variable scellée n'est pas copiée d'un environnement à l'autre) |
| 503 en ligne | `make auth-down-remote` | `make auth-down-remote ENV=staging` |

Les deux sont des environnements de recette au sens d'ACC-SEC-02 (données et comptes de démo uniquement).

**Risque non levé** : Railway ne dit pas si la limite de 3 services du plan Free compte les services du projet (2) ou leurs instances dans chaque environnement (2 × 2 = 4). On le saura au passage en Free (vers le 2026-12-25). Repli : `staging` sur **Render Free** (branche `develop`, déploiement après les checks de CI, base Neon `pulse-staging`) ; le simulateur de recette y devient public, sa route `/__control` restant protégée par son secret.

## Releases : release-please

[release-please](https://github.com/googleapis/release-please) lit les commits Angular arrivés sur `main`, en déduit la prochaine version (SemVer) et tient `CHANGELOG.md`. Personne ne choisit un numéro ni ne rédige de notes à la main.

1. **Promotion** (workflow.md → Promotion), avec deux conditions de plus : `e2e` vert, et cartes du sprint vérifiées sur `staging`. Fusion en merge commit, `production` se redéploie.
2. **PR de release** : release-please ouvre (ou met à jour) la PR `chore(main): release X.Y.Z`, qui ne touche que `CHANGELOG.md` et la version. On relit le changelog : c'est la liste des commits du sprint, avec leurs identifiants de spec.
3. **Publication** : à sa fusion, release-please crée le tag `vX.Y.Z` et la Release GitHub.
4. **Report** : PR `main` → `develop` en merge commit (`chore(release): report de vX.Y.Z`), pour que `develop` ait le changelog et la version.
5. **Vérification** de `production` : `/health` affiche le bon commit, connexion d'Alex et de Léa, un 401.

| Version | Moment |
|---|---|
| `v0.1.0` | Fin S0 : socle déployé |
| `v0.2.0` | Fin S1 : F1 à F6 |
| `v0.3.0` ou `v0.2.x` | Fin S2 : recette passée |
| `v1.0.0` | Version présentée en soutenance |

Réglages et pièges :
- **Configuration** : `release-please-config.json` (type `simple`, un seul paquet à la racine, sections du changelog en français) et `.release-please-manifest.json` (`0.0.0` au départ). `bootstrap-sha` est le commit du dossier de specs (`3a04db1`), point de départ de la V1 : l'historique de la V0 n'entre pas dans le changelog.
- release-please ne crée de release que s'il y a au moins un `feat`, `fix`, `perf` ou `revert` depuis la précédente.
- **Forcer `v1.0.0`** : écrire `Release-As: 1.0.0` dans le **corps du merge commit** de la dernière promotion (GitHub permet de l'éditer au moment de fusionner).
- **Corriger une note** après coup : bloc `BEGIN_COMMIT_OVERRIDE` … `END_COMMIT_OVERRIDE` dans la description de la PR fusionnée, ce qui ne marche que pour une PR fusionnée en squash (vers `develop`).
- **Pas de PR de release ?** Vérifier qu'une ancienne PR ne porte plus l'étiquette `autorelease: pending`, puis relancer le workflow.
- **Version dans le code** : dès que le workspace Rust existe, ajouter `Cargo.toml` (`$.workspace.package.version`) et `apps/web/package.json` (`$.version`) dans `extra-files`, et vérifier que `Cargo.lock` suit.

### Jeton : une GitHub App

Une PR ouverte avec le `GITHUB_TOKEN` ne déclenche **aucun** workflow : la PR de release n'aurait jamais ses checks requis. Le workflow demande donc à une GitHub App, `pulse-release-please-bot`, un jeton valable **1 heure** et limité à ce dépôt (`actions/create-github-app-token`). Il n'appartient à personne, n'expire pas, et n'importe quel membre peut approuver la PR du bot.

- Création : faite par Maxime le 2026-11-25 (Client ID dans la variable `RELEASE_APP_CLIENT_ID`).
- Installation : Mael, seul à pouvoir installer une app sur son compte, sur `mael-bourdin/pulse` uniquement.
- Secret `RELEASE_APP_PRIVATE_KEY` : saisi par Maxime le 2026-11-27 dans Settings → Secrets and variables → Actions, puis le fichier `.pem` est supprimé du poste.
- L'app doit être **publique** (Advanced → Make public) pour pouvoir être installée sur un autre compte que celui de son créateur.
- Tant que l'app n'est pas installée, le workflow retombe sur `GITHUB_TOKEN` : la PR de release est créée, mais il faut la fermer puis la rouvrir à la main pour lancer la CI.
- `release-please-action` et `create-github-app-token` sont **épinglées par SHA** : c'est le seul workflow qui manipule une clé et un jeton en écriture.

## E2E vers `main`

Workflow `e2e.yml`, sur chaque PR vers `main` dès que `e2e/playwright.config.ts` existe, sauf la PR de release-please (elle ne touche que le changelog) : `make e2e` (compilation, stack complète, Playwright Chromium bureau et mobile 390 px, axe), rapport en artefact 7 jours si échec. `AUTH_SIM_CONTROL_TOKEN` est tiré au hasard à chaque exécution : aucun secret dans GitHub.

Seulement vers `main` parce que c'est le job le plus lent ; les E2E restent lançables en local à tout moment. Le check `e2e` s'ajoute aux checks requis du ruleset de `main` ([ci.md](ci.md) → Protection des branches).

## Mise en place

1. Mael installe `pulse-release-please-bot` ; Maxime saisit le secret.
2. Création du projet Neon `pulse-staging` et de l'environnement Railway `staging` (services, variables, « Wait for CI » sur la branche `develop`).
3. Après la première exécution de `e2e.yml`, Mael ajoute `e2e` aux checks requis de `main`.
