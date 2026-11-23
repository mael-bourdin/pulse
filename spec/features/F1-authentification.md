# F1 — Authentification et gestion des accès

- **Responsable** : Grégory
- **User stories** : US-AUTH-01, US-AUTH-02, US-AUTH-03
- **Règles** : RG-AUTH-01 à 06
- **Contrat** : [api/auth.openapi.yaml](../api/auth.openapi.yaml) (HAC-API-001)
- **Décisions** : ADR-10, 11, 12, 14, 15, 16

## Comportement

### Simulateur (`crates/auth-simulator`)

| Id | Exigence | Source |
|---|---|---|
| F1-R01 | Expose `POST /api/v1/auth/login` et `GET /api/v1/auth/me`, en JSON camelCase | ACC-AUTH-01, 02 |
| F1-R02 | Utilisateurs chargés depuis `data/users.json` (les 6 comptes de DATA, rôles et états inchangés). Mots de passe hachés en **Argon2id**, jamais en clair | ACC-AUTH-09, ADR-14 |
| F1-R03 | Identifiants corrects + compte ACTIVE → **200** avec `userId`, `email`, `displayName`, `role`, `accountStatus`, `accessToken`, `tokenType: "Bearer"`, `expiresIn: 3600` | ACC-AUTH-03 |
| F1-R04 | Corps non JSON, pas un objet, `email` ou `password` absent, vide ou non textuel → **400** `AUTH_BAD_REQUEST`. Les clés supplémentaires sont ignorées | ACC-AUTH-04 |
| F1-R05 | Mauvais mot de passe **ou** adresse inconnue → **401** `AUTH_INVALID_CREDENTIALS`, avec un corps identique. Un hachage factice est calculé si l'adresse est inconnue, pour que le temps de réponse ne trahisse rien | ACC-AUTH-05, REC-02 |
| F1-R06 | Compte DISABLED → **403** `AUTH_ACCOUNT_DISABLED`, **seulement** si l'adresse et le mot de passe sont corrects ; sinon 401 | ACC-AUTH-06, REC-03 |
| F1-R07 | Indisponibilité → **503** `AUTH_SERVICE_UNAVAILABLE` sur les deux endpoints. Déclenchée par `AUTH_SIM_UNAVAILABLE=true` au démarrage ou par `POST /__control/availability` (en-tête `X-Control-Token`), sans redémarrage | ACC-AUTH-07, REC-04, ADR-15 |
| F1-R08 | Jeton opaque aléatoire (≥ 128 bits), gardé en mémoire avec son `userId` et son expiration (`AUTH_SIM_TOKEN_TTL`, 3600 s par défaut) | ACC-AUTH-08 |
| F1-R09 | `/me` avec un jeton valide → **200** identité, sans jeton ; jeton absent, mal formé, inconnu ou expiré → **401** `AUTH_INVALID_TOKEN` ; compte devenu DISABLED → **403** | ACC-AUTH-08, REC-05 |
| F1-R10 | Aucune réponse ni aucun journal ne contient de mot de passe, de haché ou de jeton | ACC-AUTH-09, ACC-SEC-02 |
| F1-R11 | Route inconnue → 404 `{ code, message }` ; erreur interne → 500 générique, sans trace | ACC-SEC-07 |
| F1-R12 | `/__control/availability` sans jeton valide → 401. Si `AUTH_SIM_CONTROL_TOKEN` n'est pas défini, la route est désactivée | ADR-15 |

### Intégration dans PULSE (`crates/pulse-api`)

| Id | Exigence | Source |
|---|---|---|
| F1-R20 | Seul le module `auth_client` appelle le service d'auth, à l'URL `AUTH_SERVICE_URL`, avec un délai maximal `AUTH_TIMEOUT_MS` (3000 ms) | ACC-AUTH-10, 11, ACC-QUAL-02 |
| F1-R21 | `POST /api/v1/session` valide `email` (1–254) et `password` (1–200). Si invalide → 400 `LOGIN_INVALID_REQUEST`, **sans** appeler le service | ACC-SEC-03 |
| F1-R22 | Correspondance des réponses de `/login` : 400 → 400 `LOGIN_INVALID_REQUEST` ; 401 → 401 `LOGIN_INVALID_CREDENTIALS` ; 403 → 403 `ACCOUNT_DISABLED` ; 503 → 503 `AUTH_UNAVAILABLE` | ACC-AUTH-16, ACC-SEC-06 |
| F1-R23 | **Validation des réponses** : sont traités comme **503 `AUTH_UNAVAILABLE`** (cause journalisée sans donnée sensible) tous les cas suivants : JSON invalide, champ manquant, rôle inconnu, `tokenType` ≠ `Bearer`, `expiresIn` ≤ 0, 200 avec `accountStatus = DISABLED`, statut non prévu (ex. 500), délai dépassé, connexion refusée | ACC-SEC-05, TECH §4.5, RG-AUTH-06 |
| F1-R24 | Connexion réussie → `200 { user }`, avec `user = { userId, displayName, email, role }`, et un cookie `pulse_session` = jeton opaque : `HttpOnly`, `SameSite=Strict`, `Path=/`, `Max-Age=expiresIn`, `Secure` si `COOKIE_SECURE=true`. Le jeton n'apparaît **jamais** dans le corps de la réponse | ACC-AUTH-12, ADR-10 |
| F1-R25 | Chaque requête protégée appelle `/me` avec le jeton du cookie, **sans cache**. L'identité et le rôle viennent uniquement de `/me` | ACC-AUTH-12, REC-05, ADR-10 |
| F1-R26 | En cours de session : `/me` 401 → **401 `SESSION_EXPIRED`** et cookie effacé ; `/me` 403 → **403 `ACCOUNT_DISABLED`** et cookie effacé ; 503 ou réponse invalide → **503 `AUTH_UNAVAILABLE`**, cookie **conservé** | ACC-AUTH-16 |
| F1-R27 | `DELETE /api/v1/session` → 204 et cookie effacé (`Max-Age=0`). Le contrat ne prévoit pas de révocation, donc le jeton expire de lui-même | — |
| F1-R28 | Contrôle de rôle côté API : `/api/v1/me/*` exige USER, `/api/v1/admin/*` exige FUNCTIONAL_ADMIN. Mauvais rôle → **403 `FORBIDDEN`**, même en appel direct | ACC-AUTH-13, 14, 15, ACC-ADM-01, 02, RG-AUTH-03 à 05 |
| F1-R29 | Écritures (`POST`, `PUT`, `PATCH`, `DELETE`) : `Origin` absent de `ALLOWED_ORIGINS` → 403 `ORIGIN_REJECTED` ; `Content-Type` différent de `application/json` (pour les requêtes avec corps) → 415 | ADR-11 |
| F1-R30 | Limite de débit sur `POST /session` : `LOGIN_RATE_LIMIT_PER_MIN` (5 par défaut) essais par minute **par IP (lue dans `X-Forwarded-For` si `TRUST_PROXY=true`)** → 429 `TOO_MANY_ATTEMPTS`. Jamais de limite par adresse e-mail | ADR-16, ACC-AUTH-05 |
| F1-R31 | Journaux : méthode, route, statut, durée, identifiant de requête. Jamais de corps, de cookie, d'en-tête `Authorization` ni d'e-mail | ACC-SEC-07, constitution §6 |

### Interface (`apps/web`)

| Id | Exigence | Source |
|---|---|---|
| F1-R40 | Après connexion : USER → `/`, FUNCTIONAL_ADMIN → `/admin` | RG-AUTH-03, P1 |
| F1-R41 | Garde de route : sans session → `/connexion` ; mauvais rôle → `/acces-refuse`. Cette garde est un confort d'affichage, l'API reste le vrai contrôle (F1-R28) | ACC-AUTH-15 |
| F1-R42 | Au chargement de l'app : `GET /session` rétablit la session ou renvoie vers `/connexion` | REC-05 |
| F1-R43 | Toute réponse 401 `SESSION_EXPIRED` renvoie vers `/connexion` avec le message de session expirée. Une réponse 503 affiche une alerte, sans déconnecter | ACC-AUTH-16 |

## Écrans

### `/connexion` (UX p.4)
- **Colonne gauche** :
  - titre « Bienvenue dans PULSE » ;
  - texte « Votre espace personnel pour suivre vos objectifs, vos défis et votre progression. » ;
  - encadré « **Confidentialité** — Votre employeur n'accède pas à vos données individuelles. ».
- **Colonne droite** : titre « Se connecter », champs « Adresse e-mail » et « Mot de passe » (obligatoires), bouton « Se connecter ».
- **Chargement** : le bouton est désactivé et affiche « Connexion… ».
- **Erreurs**, affichées sous le formulaire dans une zone `role="alert"`, avec le mot de passe vidé :

| Cas | Titre | Texte |
|---|---|---|
| Champ vide (contrôle local) | — | « L'adresse e-mail est obligatoire. » ou « Le mot de passe est obligatoire. », sous le champ concerné |
| 400 | Connexion impossible | « Veuillez renseigner votre adresse e-mail et votre mot de passe. » |
| 401 | Connexion impossible | « Adresse e-mail ou mot de passe incorrect. » |
| 403 | Accès non autorisé | « Ce compte n'est pas autorisé à accéder à PULSE. Contactez votre référent HealthAI Coach. » |
| 429 | Trop de tentatives | « Trop de tentatives. Réessayez dans une minute. » |
| 503 / réseau | Service momentanément indisponible | « Le service de connexion est momentanément indisponible. Réessayez dans quelques instants. » (couleur d'avertissement, distincte d'un refus) |

- **Après expiration de session** : bandeau d'information « Votre session a expiré. Merci de vous reconnecter. ».
- **Accessibilité** :
  - `autocomplete="username"` et `autocomplete="current-password"` ;
  - le focus passe sur l'alerte en cas d'erreur ;
  - erreurs de champ reliées par `aria-describedby` ;
  - responsive : une seule colonne sous 760 px.

### `/acces-refuse` (UX p.11 « Accès refusé »)
- Badge « Accès refusé », titre « Droits insuffisants ».
- Texte : « Cet espace est réservé à un autre profil. Cette restriction est appliquée par le serveur PULSE, pas seulement par l'interface. »
- Bouton « Revenir à mon espace ».

### En-tête (toutes les pages connectées)
- Nom affiché (`displayName`) et bouton « Se déconnecter ».
- En admin, rôle affiché : « Léa Bernard • FUNCTIONAL_ADMIN » (UX p.10).
- Menu repliable sous 820 px (`aria-expanded`).

## API

| Action | Endpoint | Codes attendus |
|---|---|---|
| Se connecter | `POST /api/v1/session` | 200, 400, 401, 403, 429, 503 |
| Vérifier la session | `GET /api/v1/session` | 200, 401, 403, 503 |
| Se déconnecter | `DELETE /api/v1/session` | 204 |

Voir [api/endpoints.md](../api/endpoints.md).

## Critères d'acceptation

| Critère | Exigences | Vérification | Test |
|---|---|---|---|
| ACC-AUTH-01, 02 | R01 | Intégration simulateur | `acc_auth_02_endpoints_exposes` |
| ACC-AUTH-03 | R03 | Intégration simulateur | `acc_auth_03_login_200_structure_contrat` |
| ACC-AUTH-04 | R04 | Intégration simulateur (5 cas + JSON invalide) | `acc_auth_04_requete_invalide_400` |
| ACC-AUTH-05 / REC-02 | R05, R22 | Intégration simulateur + API, E2E | `acc_auth_05_401_identique_adresse_connue_ou_non`, `rec_02` |
| ACC-AUTH-06 / REC-03 | R06, R22 | Intégration simulateur + API, E2E | `acc_auth_06_compte_desactive_403`, `rec_03` |
| ACC-AUTH-07 / REC-04 | R07, R22, R26 | Intégration simulateur + API, E2E | `acc_auth_07_indisponibilite_503`, `rec_04` |
| ACC-AUTH-08 / REC-05 | R08, R09, R25 | Intégration simulateur + API, E2E | `acc_auth_08_jeton_me`, `rec_05` |
| ACC-AUTH-09 | R02, R10 | Intégration simulateur | `acc_auth_09_jamais_de_mot_de_passe` |
| ACC-AUTH-10, 11 | R20 | Intégration API (simulateur sur port aléatoire) | `acc_auth_11_url_configurable` |
| ACC-AUTH-12 / REC-01 | R24, R25 | Intégration API, E2E | `acc_auth_12_contexte_utilisateur`, `rec_01` |
| ACC-AUTH-13, 15 / REC-12 | R28 | Intégration API, E2E | `acc_auth_13_user_refuse_admin`, `rec_12` |
| ACC-AUTH-14 / REC-11 | R28, R40 | Intégration API, E2E | `acc_auth_14_admin_accede`, `rec_11` |
| ACC-AUTH-16 | R22, R23, R26, R43 | Intégration API | `acc_auth_16_erreurs_maitrisees` |
| ACC-SEC-05 | R23 | Intégration API (faux service qui renvoie des réponses invalides) | `acc_sec_05_reponse_invalide_503` (un cas par anomalie) |
| ACC-SEC-06 | R22, R26 | Intégration API | `acc_sec_06_codes_distincts` |

## Hors périmètre

- OAuth2, OIDC, SSO, MFA ;
- renouvellement ou révocation de jeton ;
- mot de passe oublié ;
- création de compte.
