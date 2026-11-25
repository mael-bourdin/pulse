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
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Requête refusée. |
| 409 | `INVALID_STATE` | (message précis selon la transition refusée) |
| 409 | `CHALLENGE_NOT_JOINABLE` | Ce défi n'est pas ouvert aux inscriptions. |
| 409 | `ALREADY_JOINED` | Vous participez déjà à ce défi. |
| 409 | `NOT_JOINED` | Vous ne participez pas à ce défi. |
| 429 | `TOO_MANY_ATTEMPTS` | Trop de tentatives. Réessayez dans une minute. |
| 503 | `AUTH_UNAVAILABLE` | Le service de connexion est momentanément indisponible. |
| 500 | `INTERNAL_ERROR` | Une erreur inattendue est survenue. |

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

Une réponse ne contient que les champs listés ici.

- **Pas de `userId`** dans les ressources : sous `/me/*`, la propriété est implicite (constitution §4, §5). Seul `SessionUser` porte le sien, celui de la session. Aucune réponse ne contient de donnée d'un autre utilisateur.
- **Nombres** : les colonnes `numeric(12,2)` sont des nombres JSON (`7.5`), jamais des chaînes. On active la fonctionnalité `serde-float` de `rust_decimal`, et `decimal_float` d'utoipa pour que l'OpenAPI, donc les types générés du front, disent `number`. En entrée, une chaîne à la place d'un nombre (`"12"`) est refusée (400) : `rust_decimal` l'accepterait par défaut.
- **Dates** : `"YYYY-MM-DD"`.
- **Null** : un champ marqué « oui » est toujours présent, avec la valeur `null`. Il n'est jamais omis.

### `SessionUser`

Le `user` de `POST /session` et `GET /session` (F1-R24).

| Champ | Type | Null | Source |
|---|---|---|---|
| `userId` | string | non | service d'auth (`/login`, puis `/me`) ; aucune table |
| `displayName` | string | non | service d'auth |
| `email` | string | non | service d'auth |
| `role` | `USER` ou `FUNCTIONAL_ADMIN` | non | service d'auth |

### `Preferences`

| Champ | Type | Null | Source |
|---|---|---|---|
| `themePrioritaire` | énum `category` | non | `preferences.theme_prioritaire` |
| `notifications` | boolean | non | `preferences.notifications` |
| `frequenceRappel` | énum `reminder_frequency` | non | `preferences.frequence_rappel` |
| `momentPrefere` | énum `preferred_moment` | non | `preferences.moment_prefere` |
| `participationDefis` | boolean | non | `preferences.participation_defis` |

Non renvoyés : `preference_id`, `user_id`, `updated_at`.

### `Goal`

| Champ | Type | Null | Source |
|---|---|---|---|
| `goalId` | string | non | `goals.goal_id` |
| `label` | string | non | `goals.label` |
| `category` | énum `category` | non | `goals.category` |
| `targetValue` | number | non | `goals.target_value` |
| `currentValue` | number | non | `goals.current_value` |
| `unit` | string | non | `goals.unit` |
| `status` | énum `goal_status` | non | `goals.status` |
| `startDate` | date | non | `goals.start_date` |
| `endDate` | date | oui | `goals.end_date` |
| `progressPercent` | integer, de 0 à 100 | non | calculé par le serveur (F3-R09) |

Non renvoyé : `user_id`.

`progressPercent` vaut `min(100, arrondi(currentValue / targetValue × 100))`. Il est calculé dans `pulse-domain` et le front ne le recalcule jamais. L'arrondi va au plus proche, **demi vers le haut** (12,5 → 13) : `round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero)`. Pas `round()` de `rust_decimal`, qui arrondit au pair (12,5 → 12).

### `Challenge`

Réponse de `/admin/challenges`, et base de `ChallengeView`.

| Champ | Type | Null | Source |
|---|---|---|---|
| `challengeId` | string | non | `challenges.challenge_id` |
| `title` | string | non | `challenges.title` |
| `category` | énum `category` | non | `challenges.category` |
| `description` | string | non | `challenges.description` |
| `startDate` | date | non | `challenges.start_date` |
| `endDate` | date | non | `challenges.end_date` |
| `targetValue` | number | non | `challenges.target_value` |
| `unit` | string | non | `challenges.unit` |
| `status` | énum `challenge_status` | non | `challenges.status` |

Non renvoyé : `created_by`, ni aux USER ni à l'admin (aucun écran ne l'affiche).

### `ChallengeView`

Réponse de `/me/challenges`. Les champs de `Challenge`, au même niveau, plus :

| Champ | Type | Null | Source |
|---|---|---|---|
| `myParticipation` | `Participation` | oui | participation de l'utilisateur de la session sur ce défi : l'ACTIVE, sinon la plus récente, sinon `null` (F4-R02) |
| `canJoin` | boolean | non | calculé (F4-R03) |

### `Participation`

| Champ | Type | Null | Source |
|---|---|---|---|
| `status` | énum `participation_status` | non | `participations.status` |
| `joinedAt` | date | non | `participations.joined_at` |
| `progressValue` | number | non | `participations.progress_value` |

Non renvoyés : `participation_id`, `challenge_id` (déjà porté par le défi), `user_id`. Jamais la participation d'un autre utilisateur (F4-R09).

### `Content` (SHOULD)

| Champ | Type | Null | Source |
|---|---|---|---|
| `contentId` | string | non | `contents.content_id` |
| `title` | string | non | `contents.title` |
| `type` | énum `content_type` | non | `contents.type` |
| `category` | énum `category` | non | `contents.category` |
| `status` | énum `content_status` | non | `contents.status` |
| `publishedAt` | date | oui | `contents.published_at` |
| `updatedAt` | date | non | `contents.updated_at` |

Non renvoyé : `author_id`.

### `ProgressSummary`

Réponse de `GET /me/progress` (F5).

| Champ | Type | Null | Source |
|---|---|---|---|
| `period` | `{ start, end }`, deux dates | oui | `metrics.period_start` et `metrics.period_end` de la métrique la plus récente (F5-R02) |
| `metrics` | `Metric[]` | non | toujours 4 éléments, dans l'ordre de F5-R03 |
| `goals.active`, `goals.suspended`, `goals.closed` | integer | non | nombre de lignes de `goals` par statut (F5-R04) |
| `goals.items` | `Goal[]` | non | objectifs ACTIVE, liste vide s'il n'y en a pas (F5-R05) |
| `challenges.active` | integer | non | nombre de lignes de `participations` ACTIVE (F5-R04) |
| `challenges.items` | `ChallengeView[]` | non | défis dont `myParticipation` est ACTIVE, liste vide s'il n'y en a pas (F5-R05) |

### `Metric`

| Champ | Type | Null | Source |
|---|---|---|---|
| `metricType` | `WEEKLY_ACTIVE_DAYS`, `STREAK_DAYS`, `WELLBEING_CHECKINS` ou `HYDRATION_DAYS` | non | `metrics.metric_type` |
| `label` | string | non | tableau fixe de F5, présent même sans donnée |
| `value` | number | oui | `metrics.value` sur la période, `null` sans donnée |
| `unit` | string | non | tableau fixe de F5, présent même sans donnée |

Non renvoyés : `metric_id`, `user_id`.

## Normalisation des entrées

Les chaînes sont **trimées** avant validation. Une chaîne qui ne contient que des espaces compte comme vide (400). Cela vaut aussi pour `email` et `password` côté simulateur.
