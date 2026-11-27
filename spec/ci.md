# CI et protection des branches

Responsables : **Maxime** (CI), **Mael** (réglages GitHub : lui seul est admin du dépôt). Répond au CDC §5.2 (« stratégie simple de branches, commits et revues ») et §5.6 (« vérifications automatisées simples »). Décisions : ADR-29, ADR-34.

## Périmètre

Une CI **légère** : quelques vérifications bloquantes sur chaque PR, rien de plus. Elle ne déploie rien et ne détient aucun secret.

HAC-TECH-001 §5 dit que « la construction d'un pipeline CI/CD de mise en production » ne relève pas de V1, et le CDC §6 exclut « un pipeline CI/CD complet de mise en production ». HAC-ACC-001 §13 n'en fait pas non plus un critère d'acceptation. Ce qui suit est un outil de l'équipe, pas un livrable.

## Workflows

| Workflow | Déclencheurs | Rôle |
|---|---|---|
| `ci.yml` | `pull_request` vers `develop` ou `main`, `push` sur `develop` et `main` | Vérifications du code |
| `pr-title.yml` | `pull_request` (ouverture, modification du titre, nouveau commit) | Titre de PR au format Angular (ADR-34) |

- **Droits** : `permissions: contents: read` par défaut, `pull-requests: read` pour gitleaks, aucun droit pour `pr-title`. Pas de `pull_request_target`, aucun secret.
- **Concurrence** : `group: ci-${{ github.ref }}`, annulation des exécutions précédentes **seulement pour les PR**.
- **Durée** : `timeout-minutes` sur chaque job ; objectif moins de 10 min pour une PR, grâce au cache Rust.
- La CI lance **les mêmes commandes** que `make check` sur les postes ([testing.md](testing.md)).
- **Activation progressive** : un job `detect` regarde si `Cargo.toml` (workspace Rust) et `apps/web/pnpm-lock.yaml` (front V1) existent. Tant qu'ils n'existent pas, `rust` et `web` sont **sautés**, et GitHub compte un job sauté comme réussi pour un check requis. Ils s'activent seuls quand le socle arrive dans `develop`, sans retoucher la CI ni les rulesets.

| Job | Quand | Contenu |
|---|---|---|
| `rust` | dès que `Cargo.toml` existe | `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace` avec un service `postgres:16`, `pulse-api` ne dépend pas d'`auth-simulator` (ADR-12), `cargo deny check` dès que `deny.toml` existe, contrôle de l'OpenAPI généré |
| `web` | dès que `apps/web/pnpm-lock.yaml` existe | Dans `apps/web` : `pnpm install --frozen-lockfile`, `lint` et `typecheck` s'ils existent, `build` |
| `secrets` | toujours | gitleaks sur tout l'historique (`fetch-depth: 0`). Aucune fuite trouvée le 2026-11-25, donc pas de liste d'exceptions |
| `pr-title` | PR | `type(scope): sujet` avec un type Angular ; un titre `feat` ou `fix` finit par l'identifiant de spec entre crochets (`[F3-R07]`, `[ADR-05]`) |

**Front V1** : il n'y a plus de workspace pnpm à la racine une fois la V0 supprimée. `apps/web` a son propre `package.json`, avec le champ `packageManager` (lu par `pnpm/action-setup`), et son propre `pnpm-lock.yaml`.

**Contrôle de l'OpenAPI** : `spec/api/pulse.openapi.yaml` est généré par utoipa (ADR-07) avec `pulse-api openapi`, et versionné. Si le code change l'API sans que le fichier régénéré soit commité, `rust` échoue. `endpoints.md` décrit l'intention ; en cas d'écart, on corrige l'un ou l'autre dans la même PR.

**Actions utilisées** (versions majeures en vigueur au 2026-11-25) :

| Action | Version |
|---|---|
| `actions/checkout` | `v7` |
| `actions-rust-lang/setup-rust-toolchain` | `v2` : lit `rust-toolchain.toml`, met en cache `target/` |
| `EmbarkStudios/cargo-deny-action` | `v2` |
| `pnpm/action-setup` + `actions/setup-node` | `v6` + `v7` avec `cache: pnpm` |
| `gitleaks/gitleaks-action` | `v3` (gratuit pour un dépôt personnel ; une licence gratuite serait demandée si le dépôt passait dans une organisation) |

Ces workflows sont en lecture seule : leurs actions sont épinglées sur leur version majeure. Une action qui recevrait un secret ou des droits en écriture serait épinglée par SHA de commit.

**Règles** :
- `develop` rouge = on répare avant toute autre fusion.
- Pas de `continue-on-error`, pas de relance automatique d'un test instable ([testing.md](testing.md) → Tests instables).
- Alertes et correctifs de sécurité **Dependabot** activés ; pas de PR automatiques de montée de version pendant le projet.

## Protection des branches

Le dépôt `mael-bourdin/pulse` est **public** et appartient à un compte personnel : les rulesets et les minutes Actions sont gratuits. S'il redevenait privé sur un compte Free, on perdrait les rulesets. Les collaborateurs ont le droit Write, Mael est le seul admin : c'est lui qui configure.

Un ruleset par branche (Settings → Rules → Rulesets) :

| Règle | `main` | `develop` |
|---|---|---|
| Restrict deletions | oui | oui |
| Block force pushes | oui | oui |
| Require a pull request | oui, **1 approbation** | oui, **1 approbation** |
| Dismiss stale approvals on new push | oui | oui |
| Require conversation resolution | oui | oui |
| Allowed merge methods | **Merge** uniquement | **Squash** et **Merge** (merge réservé aux reports `main` → `develop`) |
| Require status checks | `rust`, `web`, `secrets`, `pr-title` | les mêmes |
| Require branches to be up to date | oui | non (évite les rebases en chaîne à 4) |
| Bypass list | **vide**, admin compris | **vide**, admin compris |

Si l'option « Allowed merge methods » n'apparaît pas dans le ruleset, on autorise squash et merge dans les réglages du dépôt, et c'est le relecteur qui vérifie la méthode.

Réglages du dépôt (Settings → General) :
- Branche par défaut : `develop`.
- Fusions : merge commit et squash autorisés, rebase désactivé ; message de squash par défaut = titre de la PR.
- « Automatically delete head branches » activé.
- Actions : `GITHUB_TOKEN` en lecture seule par défaut ; Actions ne peut ni créer ni approuver de PR.

## Mise en place

1. Mael applique les réglages du dépôt ci-dessus.
2. Les checks n'apparaissent dans la liste des rulesets qu'après avoir tourné une fois : Mael crée les deux rulesets **après** la fusion de la PR qui ajoute `ci.yml`.
3. Maxime écrit `make check` avec le socle Rust, en reprenant les commandes des jobs.
