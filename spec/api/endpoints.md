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
| GET | `/health` | — | hébergement | `200 { status, version, commit }` (hors `/api/v1`). Vérifie la base, n'appelle jamais le service d'auth ; 503 si la base ne répond pas ([ci-cd.md](../ci-cd.md) → Healthcheck) |

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
