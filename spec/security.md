# Sécurité et confidentialité

Responsable : **Grégory** (référent sécurité). Cette page répond au CDC §4.1, §4.5 et §5.6, et à ACC-SEC-01…07.

## Menaces et parades

| Menace | Parade | Réf. |
|---|---|---|
| Un USER accède à l'admin | Extracteur `RequireRole<Admin>` sur toutes les routes `/admin/*` → 403 ; garde de route côté front en plus | ACC-AUTH-13…15, ACC-ADM-02 |
| Lire ou modifier les données d'un autre utilisateur | `user_id` toujours tiré de `/me` ; chaque requête SQL filtre sur `user_id` ; une ressource d'un autre renvoie 404 | ACC-PREF-06, ACC-GOAL-09, ACC-PROG-03 |
| Deviner si un compte existe | Simulateur : même 401 et même temps de réponse (haché factice) ; PULSE : même message ; limite par IP, pas par e-mail | ACC-AUTH-05 |
| Vol de session par XSS | Jeton dans un cookie httpOnly, jamais lisible en JS ; React échappe le contenu ; CSP stricte | ADR-10 |
| CSRF | `SameSite=Strict` + vérification d'`Origin` + JSON obligatoire sur les écritures | ADR-11 |
| Force brute | 5 tentatives par minute et par IP sur `POST /session` → 429 | ADR-16 |
| Entrées malveillantes | Validation côté API (types, bornes, énumérations, clés inconnues refusées) ; requêtes SQL paramétrées ; corps limité à 16 Ko | ACC-SEC-03 |
| Réponse du service d'auth piégée ou invalide | Schéma vérifié (rôle connu, `accountStatus`, `tokenType = Bearer`, champs présents) ; sinon `AUTH_UNAVAILABLE` | ACC-SEC-05 |
| Fuite d'informations techniques | `AppError` ne sort que `{ code, message }` ; panics interceptés → 500 générique | ACC-GEN-06, ACC-SEC-07 |
| Secrets dans le dépôt | `.env` ignoré ; `.env.example` sans secret ; scan `gitleaks` dans `make check` **et** dans le job CI `secrets`, bloquant sur chaque PR (aucune fuite dans l'historique au 2026-11-25). Aucun mot de passe réel nulle part (API §8) ; les mots de passe de démo ne figurent que dans le README et les données de test | ACC-SEC-01 |
| Mot de passe exposé | Simulateur : Argon2id, jamais renvoyé ; PULSE ne stocke ni ne journalise le mot de passe | ACC-AUTH-09, ACC-SEC-02 |
| Dépendances vulnérables | `cargo deny check` et `pnpm audit` dans `make check` et en CI ; alertes Dependabot activées sur le dépôt | — |
| Simulateur exposé sur Internet | Sur Railway, réseau privé seulement ; la route `/__control` exige un secret | ADR-15, ADR-17 |
| Secrets d'hébergement | `AUTH_SIM_CONTROL_TOKEN` et `DATABASE_URL` (Neon) **différents par environnement**, saisis comme variables scellées dans Railway. Les chaînes Neon ne sortent de la console que vers `.env.staging` / `.env.production` sur les postes (ignorés par Git) pour le seed. Un seul secret dans GitHub, `RELEASE_PLEASE_TOKEN` (jeton fin limité au dépôt, 90 jours) ; la CI ne déploie pas et n'a aucun jeton Railway | ADR-30, ADR-34 |
| CI détournée par une PR | Jobs en `permissions: contents: read` ; pas de `pull_request_target` ; aucune variable secrète exposée aux PR ; actions tierces limitées aux éditeurs connus et épinglées sur une version majeure | ADR-29 |
| Contournement de la revue | Rulesets sur `main` et `develop` : PR obligatoire, 1 approbation, checks verts, ni force-push ni suppression, **aucune exception, même pour l'admin** | ADR-29 |
| Comptes de démo publics | Les mots de passe de démo sont publiés (README, dossier HAC-DATA-001) : n'importe qui peut se connecter sur l'URL publique, y compris en admin, et modifier les données de démo. Risque **accepté** (données synthétiques, aucune donnée réelle) ; `make seed-remote` juste avant la démo. Conforme à ACC-SEC-02 : nos deux environnements en ligne sont des environnements de recette ([ci-cd.md](ci-cd.md) → Périmètre) | CDC §4.5, ACC-SEC-02 |

## En-têtes HTTP (tower-http)

- `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'`
- `Strict-Transport-Security` (en ligne), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`
- Pas de `Access-Control-Allow-Origin` : tout passe par la même origine.

## Cookie de session

`pulse_session=<jeton opaque>; HttpOnly; SameSite=Strict; Path=/; Max-Age=<expiresIn>; Secure` (`Secure` seulement en ligne).

## Journaux

- **Contenu** : JSON (`tracing`) avec `request_id`, méthode, route, statut, durée, rôle, `code` d'erreur.
- **Jamais** : mot de passe, jeton, cookie, corps de requête, e-mail, `user_id` (Q6.3 : aucune donnée personnelle).
- **Erreurs inattendues** : le détail reste côté serveur ; le client ne reçoit que `INTERNAL_ERROR`.

## Confidentialité (CDC §4.5)

- Aucun endpoint ne renvoie les données personnelles d'un autre utilisateur, y compris à l'admin.
- L'admin ne voit ni noms ni nombres de participants (ADR-23).
- Aucun écran ne laisse penser que l'employeur suit le salarié. Un encart « Votre employeur n'accède pas à vos données individuelles » figure sur la page de connexion (UX p.4).
