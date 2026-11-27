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
| `POST /me/goals` | `label` (1–120), `category`, `targetValue` (> 0), `unit` (énum, une des 9 valeurs de F3-R11), `endDate?` (`null` vaut absente) |
| `PATCH /me/goals/{id}` | mêmes champs, tous facultatifs ; `endDate: null` efface la date, `endDate` absent la laisse inchangée (F3-R10) |
| `PUT …/progress` | `currentValue` (≥ 0) |
| `POST/PUT /admin/challenges` | `title`, `category`, `description`, `startDate`, `endDate` (≥ début), `targetValue` (> 0), `unit` (énum de F3-R11), `status` |
| `POST/PUT /admin/contents` | `title`, `type`, `category`, `status` |

Une clé inconnue dans le corps est **refusée** (400). Exception : `POST /session`, où le contrat d'auth tolère les clés supplémentaires.

## Formes de réponse principales

Une réponse ne contient que les champs listés ici.

- **Pas de `userId`** dans les ressources : sous `/me/*`, la propriété est implicite (constitution §4, §5). Seul `SessionUser` porte le sien, celui de la session. Aucune réponse ne contient de donnée d'un autre utilisateur.
- **Nombres** : les colonnes `numeric(12,2)` sont des nombres JSON (`7.5`), jamais des chaînes. On active les fonctionnalités `serde-float` **et** `serde-str` de `rust_decimal`, et `decimal_float` d'utoipa pour que l'OpenAPI, donc les types générés du front, disent `number`. `serde-float` seul sort bien des nombres, mais accepte encore `"12"` en entrée (`deserialize_any`) ; avec les deux, la lecture passe par `deserialize_f64`, que serde_json refuse sur une chaîne. En entrée, une chaîne à la place d'un nombre (`"12"`) est donc refusée (400) : test `acc_sec_03_nombre_en_chaine_400`.
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
| `unit` | énum `Unit` (F3-R11) | non | `goals.unit` |
| `status` | énum `goal_status` | non | `goals.status` |
| `startDate` | date | non | `goals.start_date` |
| `endDate` | date | oui | `goals.end_date` |
| `progressPercent` | integer, de 0 à 100 | non | calculé par le serveur (F3-R09) |

Non renvoyé : `user_id`.

`progressPercent` suit F3-R09, qui fixe la formule et l'arrondi. Il est calculé dans `pulse-domain` et le front ne le recalcule jamais.

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
| `unit` | énum `Unit` (F3-R11) | non | `challenges.unit` |
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
