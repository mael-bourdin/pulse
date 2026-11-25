# API PULSE — `/api/v1`

- Format JSON en camelCase.
- Les écritures exigent `Content-Type: application/json` et un en-tête `Origin` présent dans `ALLOWED_ORIGINS`.
- Le contrat complet est **généré** par utoipa dans `spec/api/pulse.openapi.yaml` (`make openapi`). Ce tableau en est la spec de départ.

## Erreurs

Format commun : `{ "code": "…", "message": "…", "details": [{ "field": "…", "message": "…" }] }`. Le champ `details` n'apparaît que pour `VALIDATION_ERROR`.

| HTTP | `code` | Message affiché |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Certaines informations sont invalides. |
| 400 | `LOGIN_INVALID_REQUEST` | Veuillez renseigner votre adresse e-mail et votre mot de passe. |
| 401 | `LOGIN_INVALID_CREDENTIALS` | Adresse e-mail ou mot de passe incorrect. |
| 401 | `SESSION_EXPIRED` | Votre session a expiré. Merci de vous reconnecter. |
| 403 | `ACCOUNT_DISABLED` | À la connexion : « Ce compte n'est pas autorisé à accéder à PULSE. Contactez votre référent HealthAI Coach. » En cours de session : « Votre compte n'est plus autorisé à accéder à PULSE. » |
| 403 | `FORBIDDEN` | Vous n'avez pas les droits nécessaires. |
| 403 | `ORIGIN_REJECTED` | Requête refusée. |
| 404 | `NOT_FOUND` | Élément introuvable. |
| 405 | `METHOD_NOT_ALLOWED` | Requête refusée. |
| 413 | `PAYLOAD_TOO_LARGE` | Requête refusée. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Requête refusée. |
| 409 | `INVALID_STATE` | (message précis selon la transition refusée) |
| 409 | `CHALLENGE_NOT_JOINABLE` | Ce défi n'est pas ouvert aux inscriptions. |
| 409 | `ALREADY_JOINED` | Vous participez déjà à ce défi. |
| 409 | `NOT_JOINED` | Vous ne participez pas à ce défi. |
| 429 | `TOO_MANY_ATTEMPTS` | Trop de tentatives. Réessayez dans une minute. |
| 503 | `AUTH_UNAVAILABLE` | Le service de connexion est momentanément indisponible. |
| 500 | `INTERNAL_ERROR` | Une erreur inattendue est survenue. |

### Rejets techniques

Axum répond seul à certaines requêtes, en texte ou avec un corps vide. PULSE renvoie quand même `{ code, message, details? }` (ADR-08) :

| Cas | Par défaut (Axum) | Réponse de PULSE | Test |
|---|---|---|---|
| JSON illisible, ou corps qui n'est pas un objet | 400 texte | 400 `VALIDATION_ERROR`, sans `details` | `acc_sec_03_json_illisible_400` |
| Mauvais type, ex. `"targetValue": "abc"` (F3-R04) | 422 texte | 400 `VALIDATION_ERROR`, `details[0].field = "targetValue"` | `acc_sec_03_type_incorrect_400` |
| Champ obligatoire absent | 422 texte | 400 `VALIDATION_ERROR`, `field` = le champ absent | `acc_sec_03_champ_absent_400` |
| Clé inconnue | 422 texte | 400 `VALIDATION_ERROR`, `field` = la clé | `acc_sec_03_cle_inconnue_400` |
| `Content-Type` absent ou autre que `application/json` | 415 texte | 415 `UNSUPPORTED_MEDIA_TYPE` | `acc_sec_03_content_type_415` |
| Corps de plus de 16 Ko | 413 texte | 413 `PAYLOAD_TOO_LARGE` | `acc_sec_03_corps_trop_gros_413` |
| Méthode non prévue sur une route existante | 405, corps vide | 405 `METHOD_NOT_ALLOWED` | `acc_gen_06_methode_405_json` |
| Limite de débit de `POST /session` dépassée | 429 texte (`tower_governor`) | 429 `TOO_MANY_ATTEMPTS` | `acc_gen_06_limite_429_json` |
| Chemin inconnu sous `/api/v1` | page React (repli des fichiers statiques) | 404 `NOT_FOUND` | `acc_gen_06_route_inconnue_404_json` |

- Chaque route lit son corps avec un seul extracteur partagé, `ApiJson<T>`, jamais `Json<T>`. Il décode avec `serde_path_to_error`, qui donne le chemin du champ fautif. `details[].message` est un message français (« Valeur invalide. », « Champ obligatoire. »), jamais le texte de serde.
- Serde signale un champ absent au niveau de l'objet parent, pas du champ : `field` doit quand même nommer le champ absent.
- Sur `POST /session`, les erreurs de décodage (JSON illisible, mauvais type, champ absent) donnent 400 `LOGIN_INVALID_REQUEST`, sans `details` (F1-R21). 413 et 415 restent inchangés.
- La limite de 16 Ko passe par `DefaultBodyLimit::max(16_384)` ; `ApiJson` traduit son dépassement en 413. 405 : `Router::method_not_allowed_fallback`. 429 : `GovernorLayer::error_handler`. 404 : repli propre au routeur `/api/v1`, le site React ne sert que les autres chemins.
- Les longueurs (1–120, 1–254…) se comptent en caractères, `chars().count()` après trim, comme `length()` dans les `CHECK` de PostgreSQL ([data-model.md](../data-model.md)), jamais en octets avec `len()`. Test `acc_sec_03_longueur_en_caracteres` : un `label` de 120 « é » est accepté, de 121 refusé.

## Endpoints

Rôles : `—` = public, `USER`, `ADMIN` = FUNCTIONAL_ADMIN.

| Méthode | Chemin | Rôle | Spec | Réponse |
|---|---|---|---|---|
| POST | `/session` | — | F1 | `200 { user }` + cookie `pulse_session` |
| GET | `/session` | USER, ADMIN | F1 | `200 { user }` (vérifié via `/me`) |
| DELETE | `/session` | — | F1 | `204`, cookie effacé |
| GET | `/me/preferences` | USER | F2 | `Preferences` ; 404 si aucune préférence (F2-R07) |
| PUT | `/me/preferences` | USER | F2 | `Preferences` (les crée si absentes) |
| GET | `/me/goals` | USER | F3 | `Goal[]` |
| POST | `/me/goals` | USER | F3 | `201 Goal` |
| PATCH | `/me/goals/{goalId}` | USER | F3 | `Goal` (ACTIVE seulement ; corps vide → 400) |
| PUT | `/me/goals/{goalId}/progress` | USER | F3 | `Goal` |
| POST | `/me/goals/{goalId}/suspend` · `/reactivate` · `/close` | USER | F3 | `Goal` |
| GET | `/me/challenges` | USER | F4 | `ChallengeView[]` (défi + ma participation + `canJoin`) |
| GET | `/me/challenges/{challengeId}` | USER | F4 | `ChallengeView` |
| POST | `/me/challenges/{challengeId}/join` | USER | F4 | `ChallengeView` |
| POST | `/me/challenges/{challengeId}/leave` | USER | F4 | `ChallengeView` |
| GET | `/me/progress` | USER | F5 | `ProgressSummary` |
| GET | `/admin/challenges` | ADMIN | F6 | `Challenge[]` |
| POST | `/admin/challenges` | ADMIN | F6 | `201 Challenge` |
| PUT | `/admin/challenges/{challengeId}` | ADMIN | F6 | `Challenge` (refusé si CLOSED) |
| GET | `/admin/contents` | ADMIN | F6 | `Content[]` |
| POST | `/admin/contents` | ADMIN | F6 | `201 Content` |
| PUT | `/admin/contents/{contentId}` | ADMIN | F6 | `Content` |
| GET | `/health` | — | hébergement | `200 { status }` (hors `/api/v1`) |

Les espaces `/me/*` sont réservés au rôle USER ; `/admin/*` au rôle FUNCTIONAL_ADMIN (ADR-27).

Aucun endpoint ne reçoit de `userId` : il vient toujours de la session.

## Corps des requêtes

| Endpoint | Champs (tous obligatoires sauf mention) |
|---|---|
| `POST /session` | `email` (1–254), `password` (1–200) |
| `PUT /me/preferences` | `themePrioritaire`, `notifications`, `frequenceRappel`, `momentPrefere`, `participationDefis` |
| `POST /me/goals` | `label` (1–120), `category`, `targetValue` (> 0), `unit` (1–30), `endDate?` |
| `PATCH /me/goals/{id}` | mêmes champs, tous facultatifs |
| `PUT …/progress` | `currentValue` (≥ 0) |
| `POST/PUT /admin/challenges` | `title`, `category`, `description`, `startDate`, `endDate` (≥ début), `targetValue` (> 0), `unit`, `status` |
| `POST/PUT /admin/contents` | `title`, `type`, `category`, `status` |

Une clé inconnue dans le corps est **refusée** (400). Exception : `POST /session`, où le contrat d'auth tolère les clés supplémentaires.

## Formes de réponse principales

- `ChallengeView` = `Challenge` + `myParticipation: Participation | null` + `canJoin: boolean` (détail : F4-R02, F4-R03).
- `ProgressSummary` = `period`, `metrics[]` (valeur `null` si absente), `goals { active, suspended, closed, items }`, `challenges { active, items }` (détail : F5).

## Normalisation des entrées

Les chaînes sont **trimées** avant validation. Une chaîne qui ne contient que des espaces compte comme vide (400). Cela vaut aussi pour `email` et `password` côté simulateur.
