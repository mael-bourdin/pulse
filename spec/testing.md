# Tests et recette

Responsable : **Maxime** (référent recette). Règle : **chaque test porte l'identifiant du critère qu'il vérifie** dans son nom.

## Niveaux

| Niveau | Outil | Ce qu'on teste | Où |
|---|---|---|---|
| Unitaire | `cargo test` | Règles de `pulse-domain` : transitions, validation, calculs | `crates/pulse-domain/src/**` (modules `tests`) |
| Contrat simulateur | `cargo test` | Chaque cas de HAC-API-001 : 200, 400, 401 (adresse connue ou non), 403, 503, `/me` | `crates/auth-simulator/tests/contract.rs` |
| Intégration API | `cargo test` + `#[sqlx::test]` (une base neuve par test) + simulateur lancé sur un port libre | Droits, propriété des ressources, erreurs, persistance, réponses invalides du service d'auth | `crates/pulse-api/tests/*.rs` |
| E2E recette | Playwright (Chromium + WebKit, bureau et mobile 390 px) | REC-01 à REC-13 dans le navigateur | `e2e/rec-*.spec.ts` |
| Accessibilité | `@axe-core/playwright` | Chaque écran | `e2e/a11y.spec.ts` |

Pas d'E2E sur l'app Tauri : il n'existe pas de pilote WebDriver pour macOS. L'app Tauri affiche le même site, que les E2E couvrent déjà ; elle est vérifiée à la main.

## Nommage

- Rust : `acc_goal_04_cible_non_positive_refusee`
- Playwright : `test('REC-07 — gestion d'un objectif', …)`

## Commandes

| Commande | Effet |
|---|---|
| `make test` | Tests unitaires, de contrat et d'intégration (PostgreSQL local requis) |
| `make e2e` | Remet la base à zéro (`make seed`), lance la stack, puis Playwright |
| `make check` | fmt, clippy, cargo deny, eslint, tsc, gitleaks, `make test` — **à lancer avant chaque push** |

## Recette (livrable L6)

- Les E2E tournent **en local** (`make e2e` : seed, stack locale, limite de connexion relevée, 503 piloté par `/__control`).
- En ligne, la recette est **manuelle**, avec captures : `make seed-remote` avant, et le 503 via `make auth-down-remote`.
- Résultats consignés dans `docs/recette.md` : scénario, date, résultat, capture, anomalie liée.

## Anomalies

- Une carte Trello `BUG – …` avec l'étiquette « Anomalie ». La description précise : environnement (local ou en ligne), étapes, résultat attendu et obtenu, REC ou ACC touchés, commit vu dans `/health`.
- **Critique** si elle bloque un scénario REC, viole CDC §4.1 (sécurité) ou §4.5 (confidentialité), ou correspond à l'une des **conditions bloquantes** de HAC-ACC-001 §12. Les anomalies critiques passent en tête de « À faire » et sont corrigées avant la revue de version (CDC §5.6).
- Conditions bloquantes (ACC §12), vérifiées avant chaque promotion vers `main` :
  1. PULSE ne se lance pas à partir du dépôt et du README ;
  2. des écrans sans logique applicative ;
  3. simulateur absent ou non consommé via HAC-API-001 ;
  4. un USER accède aux fonctions FUNCTIONAL_ADMIN ;
  5. PULSE lit directement les données internes du simulateur ;
  6. un mot de passe ou une information individuelle sensible dans une réponse, un écran ou un journal ;
  7. une fonctionnalité principale non démontrable avec les données fictives ;
  8. l'admin ne peut pas créer ou modifier un défi selon les règles produit ;
  9. une erreur du service d'auth fait planter l'application ;
  10. une démonstration avec des données réelles ou identifiantes.
- Les anomalies non bloquantes sont acceptables si elles sont identifiées et documentées dans L6 (ACC §12). Chaque anomalie est reportée dans `docs/recette.md`, corrigée ou non.
- Chaque correction ajoute un test qui reproduit l'anomalie.
