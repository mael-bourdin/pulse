# API PULSE — `/api/v1`

- Format JSON en camelCase.
- Les écritures (`POST`, `PUT`, `PATCH`, `DELETE`) exigent un en-tête `Origin` présent dans `ALLOWED_ORIGINS`. Celles qui attendent un corps (tableau « Corps des requêtes ») exigent aussi `Content-Type: application/json`, sinon 415. Les écritures sans corps (`DELETE /session`, `…/suspend`, `/reactivate`, `/close`, `/join`, `/leave`) ne vérifient pas `Content-Type` et ne renvoient jamais 415 (F1-R29).
- Le contrat complet est **généré** par utoipa dans `spec/api/pulse.openapi.yaml` (`make openapi`). Ce tableau en est la spec de départ.

**Ordre des contrôles.** Quand plusieurs erreurs s'appliquent à une requête, la première de cette liste l'emporte :

1. méthode non prévue sur une route existante : 405 `METHOD_NOT_ALLOWED` ;
2. limite de débit, sur `POST /session` seulement : 429 ;
3. origine, sur les écritures : 403 `ORIGIN_REJECTED`, avant la session : une requête forgée depuis un autre site est refusée sans appeler le service d'auth ;
4. session, sur les routes protégées : sans cookie, 401 `UNAUTHENTICATED`, rendu sans appeler le service d'auth (un visiteur sans cookie ne voit jamais 503) ; sinon, réponse de `/me` : 401 `SESSION_EXPIRED`, 403 `ACCOUNT_DISABLED` ou 503 `AUTH_UNAVAILABLE` (F1-R26) ;
5. rôle : 403 `FORBIDDEN` ;
6. `Content-Type`, sur les écritures avec corps : 415 ;
7. corps de plus de 16 Ko : 413 `PAYLOAD_TOO_LARGE` ;
8. validation du corps : 400 `VALIDATION_ERROR`, ou `LOGIN_INVALID_REQUEST` sur `POST /session` ;
9. ressource inconnue ou d'un autre utilisateur : 404 `NOT_FOUND` ;
10. état : 409. Entre deux 409, l'état du défi passe avant celui de la participation.

Exemples : une progression négative sur un objectif SUSPENDED donne 400, pas 409. Rejoindre un défi CLOSED où l'on a encore une participation ACTIVE donne 409 `CHALLENGE_NOT_JOINABLE`, pas `ALREADY_JOINED`. Sur `POST /session`, le service d'auth n'est appelé qu'après l'étape 8.

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

- `ChallengeView` = `Challenge` + `myParticipation: Participation | null` + `canJoin: boolean` (détail : F4-R02, F4-R03).
- `ProgressSummary` = `period`, `metrics[]` (valeur `null` si absente), `goals { active, suspended, closed, items }`, `challenges { active, items }` (détail : F5).

## Normalisation des entrées

Les chaînes sont **trimées** avant validation. Une chaîne qui ne contient que des espaces compte comme vide (400). Cela vaut aussi pour `email` et `password` côté simulateur.
