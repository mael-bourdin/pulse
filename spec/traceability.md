# Traçabilité

Une ligne par critère : critère du dossier → exigence de spec → niveau de test → fichier de test prévu → statut.
Mettre le statut à jour dans la PR qui fait passer le test.

## Abréviations

**Niveaux de test** : U = unitaire (`pulse-domain`) · I = intégration API ou simulateur · E2E = Playwright · R = revue ou vérification manuelle.

**Fichiers prévus** :

| Raccourci | Chemin |
|---|---|
| `sim` | `crates/auth-simulator/tests/contract.rs` |
| `api/<x>` | `crates/pulse-api/tests/<x>.rs` |
| `dom/<x>` | `crates/pulse-domain/src/<x>.rs` (`#[cfg(test)]`) |
| `e2e/<x>` | `e2e/<x>.spec.ts` |

## Critères généraux (ACC-GEN)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-GEN-01 installation depuis le dépôt | [hosting.md](hosting.md) | R (clone neuf + README) + E2E | `e2e/smoke` | à faire |
| ACC-GEN-02 écrans réellement développés | F1 à F6, sections « Écrans » | E2E | `e2e/rec-*` | à faire |
| ACC-GEN-03 logique effective et données DATA | [data-model.md](data-model.md) (seed) | E2E | `e2e/rec-*` | à faire |
| ACC-GEN-04 fonctionne sans le SI réel | F1-R20 | I | `api/f1_session` | à faire |
| ACC-GEN-05 composants historiques non modifiés | ADR-01, ADR-03 | R | — | à faire |
| ACC-GEN-06 erreurs compréhensibles | F1-R22 à R26, [api/endpoints.md](api/endpoints.md) | I + E2E | `api/security`, `e2e/rec-02`, `e2e/rec-04` | à faire |
| ACC-GEN-07 données individuelles isolées | F6-R07, F4-R09, F5-R01 | I | `api/f6_admin`, `api/security` | à faire |

## F1 — Authentification (ACC-AUTH)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-AUTH-01 | F1-R01 | I | `sim` | à faire |
| ACC-AUTH-02 | F1-R01 | I | `sim` | à faire |
| ACC-AUTH-03 | F1-R03 | I | `sim` | à faire |
| ACC-AUTH-04 | F1-R04 | I | `sim` | à faire |
| ACC-AUTH-05 | F1-R05, F1-R22, F1-R30 | I + E2E | `sim`, `api/f1_session`, `e2e/rec-02` | à faire |
| ACC-AUTH-06 | F1-R06, F1-R22 | I + E2E | `sim`, `api/f1_session`, `e2e/rec-03` | à faire |
| ACC-AUTH-07 | F1-R07, F1-R12, F1-R22, F1-R26 | I + E2E | `sim`, `api/f1_session`, `e2e/rec-04` | à faire |
| ACC-AUTH-08 | F1-R08, F1-R09, F1-R25 | I + E2E | `sim`, `api/f1_session`, `e2e/rec-05` | à faire |
| ACC-AUTH-09 | F1-R02, F1-R10 | I | `sim` | à faire |
| ACC-AUTH-10 | F1-R20 | I + R | `api/f1_session` | à faire |
| ACC-AUTH-11 | F1-R20 | I | `api/f1_session` | à faire |
| ACC-AUTH-12 | F1-R24, F1-R25 | I | `api/f1_session` | à faire |
| ACC-AUTH-13 | F1-R28 | I | `api/f1_session` | à faire |
| ACC-AUTH-14 | F1-R28, F1-R40 | I | `api/f1_session` | à faire |
| ACC-AUTH-15 | F1-R28, F1-R41 | I | `api/f1_session` | à faire |
| ACC-AUTH-16 | F1-R22, F1-R23, F1-R26, F1-R43 | I | `api/f1_session` | à faire |

## F2 — Préférences (ACC-PREF)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-PREF-01 | F2-R01 | I | `api/f2_preferences` | à faire |
| ACC-PREF-02 | F2-R02 | I | `api/f2_preferences` | à faire |
| ACC-PREF-03 | F2-R03 | I | `api/f2_preferences` | à faire |
| ACC-PREF-04 | F2-R06 | I | `api/f2_preferences` | à faire |
| ACC-PREF-05 | F2-R04 | U + I | `dom/preferences`, `api/f2_preferences` | à faire |
| ACC-PREF-06 | F2-R01, F2-R05 | I | `api/f2_preferences` | à faire |

## F3 — Objectifs (ACC-GOAL)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-GOAL-01 | F3-R01 | I | `api/f3_goals` | à faire |
| ACC-GOAL-02 | F3-R02 | I | `api/f3_goals` | à faire |
| ACC-GOAL-03 | F3-R03 | I | `api/f3_goals` | à faire |
| ACC-GOAL-04 | F3-R04 | U + I | `dom/goal`, `api/f3_goals` | U fait, I à faire |
| ACC-GOAL-05 | F3-R05 | U + I | `dom/goal`, `api/f3_goals` (goal-001 → 200 ; goal-004 SUSPENDED et goal-006 CLOSED → 409) | U fait, I à faire |
| ACC-GOAL-06 | F3-R07 | U + I | `dom/goal`, `api/f3_goals` (goal-001 → SUSPENDED ; goal-004 réactivé → ACTIVE ; goal-006 → 409) | U fait, I à faire |
| ACC-GOAL-07 | F3-R07 | U + I | `dom/goal`, `api/f3_goals` (goal-004 → CLOSED ; goal-006 → 409) | U fait, I à faire |
| ACC-GOAL-08 | F3-R06 | U + I | `dom/goal`, `api/f3_goals` (goal-004 et goal-006 → 409 ; valeur négative → 400) | U fait, I à faire |
| ACC-GOAL-09 | F3-R08 | I | `api/f3_goals` | à faire |

goal-004 appartient à Samira, goal-006 à Chloé : ces cas se testent avec leur compte.

## F4 — Défis (ACC-CHAL)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-CHAL-01 | F4-R01 | I | `api/f4_challenges` | à faire |
| ACC-CHAL-02 | F4-R01, écran `/defis` | I + E2E | `api/f4_challenges`, `e2e/rec-09` | à faire |
| ACC-CHAL-03 | F4-R03, F4-R04 | I | `api/f4_challenges` | à faire |
| ACC-CHAL-04 | F4-R04 | I | `api/f4_challenges` | à faire |
| ACC-CHAL-05 | F4-R06 | U + I | `dom/challenge`, `api/f4_challenges` | U faits, I à faire |
| ACC-CHAL-06 | F4-R05 | U + I | `dom/challenge`, `api/f4_challenges` (chl-004 CLOSED et chl-003 UPCOMING → 409 `CHALLENGE_NOT_JOINABLE`, chacun avec son message) | U faits, I à faire |
| ACC-CHAL-07 | F4-R08 | U + I | `dom/challenge`, `api/f4_challenges` | U faits, I à faire |
| ACC-CHAL-08 | F4-R09 | I | `api/f4_challenges` | à faire |

## F5 — Progression (ACC-PROG)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-PROG-01 | F5-R01 | I | `api/f5_progress` | à faire |
| ACC-PROG-02 | F5-R02, F5-R03 | I | `api/f5_progress` | à faire |
| ACC-PROG-03 | F5-R01 | I | `api/f5_progress` | à faire |
| ACC-PROG-04 | F5-R04, F5-R05 | I | `api/f5_progress` | à faire |
| ACC-PROG-05 | F5-R03, F5-R07 | I + E2E | `api/f5_progress`, `e2e/rec-10` | à faire |

## F6 — Administration (ACC-ADM)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-ADM-01 | F6-R01 | I | `api/f6_admin` | à faire |
| ACC-ADM-02 | F6-R01 | I + E2E | `api/f6_admin`, `e2e/rec-12` | à faire |
| ACC-ADM-03 | F6-R02 | I | `api/f6_admin` | à faire |
| ACC-ADM-04 | F6-R03, F6-R05 | I | `api/f6_admin` | à faire |
| ACC-ADM-05 | F6-R04 | U + I | `dom/challenge`, `api/f6_admin` | à faire |
| ACC-ADM-06 | F6-R05 | I | `api/f6_admin` | à faire |
| ACC-ADM-07 *(SHOULD)* | F6-R08 | I | `api/f6_admin` | à faire |

## Sécurité et qualité (ACC-SEC, ACC-QUAL)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-SEC-01 aucun secret versionné | [security.md](security.md) | R + outil (gitleaks dans `make check` et le job CI `secrets`, bloquant) | `.github/workflows/ci.yml` | à faire |
| ACC-SEC-02 mots de passe de démo jamais renvoyés | F1-R02, F1-R10 | I | `sim`, `api/security` | à faire |
| ACC-SEC-03 entrées validées | F1-R21, F2-R04, F3-R04, F6-R04, [api/endpoints.md](api/endpoints.md) (nombre en chaîne : `acc_sec_03_nombre_en_chaine_400`) | U + I | `dom/*`, `api/*` | à faire |
| ACC-SEC-04 autorisation côté serveur | F1-R28, F6-R01, F6-R09 | I | `api/f1_session`, `api/f6_admin` | à faire |
| ACC-SEC-05 réponses du service contrôlées | F1-R23 | I (faux service) | `api/f1_session` | à faire |
| ACC-SEC-06 400/401/403/503 distingués | F1-R22, F1-R26 | I | `api/f1_session` | à faire |
| ACC-SEC-07 messages d'erreur sans trace, chemin interne ni configuration | F1-R11, F1-R31, catalogue d'erreurs et `AppError` ([api/endpoints.md](api/endpoints.md#erreurs)) | I | `sim`, `api/security` : `acc_sec_07_panique_500_generique` (route de test qui panique → 500 `INTERNAL_ERROR`, message générique) ; `acc_sec_07_auth_injoignable_sans_url` (service d'auth injoignable → 503 `AUTH_UNAVAILABLE`, corps sans `AUTH_SERVICE_URL`, hôte, port ni message d'erreur `reqwest`) | à faire |
| ACC-QUAL-01 code PULSE et simulateur séparés | [architecture.md](architecture.md) (crates distinctes) | R | — | à faire |
| ACC-QUAL-02 appels d'auth regroupés | F1-R20 | R + outil (`reqwest` utilisé seulement dans `auth_client`) | — | à faire |
| ACC-QUAL-03 cohérent avec DATA | [data-model.md](data-model.md) | E2E | `e2e/rec-*` | à faire |

## Scénarios de recette (REC)

| Scénario | Exigences | Fichier | Statut |
|---|---|---|---|
| REC-01 connexion d'Alex | F1-R24, F1-R40 | `e2e/rec-01` | à faire |
| REC-02 mauvais identifiants | F1-R05, F1-R22 | `e2e/rec-02` | à faire |
| REC-03 Thomas Roy désactivé | F1-R06, F1-R22 | `e2e/rec-03` | à faire |
| REC-04 service indisponible | F1-R07, F1-R26 | `e2e/rec-04` (bascule via `/__control/availability`) | à faire |
| REC-05 vérification de session | F1-R25, F1-R31, F1-R42 | `e2e/rec-05` : connexion d'Alex, puis rechargement de `/` → `GET /api/v1/session` 200 avec son identité, et `document.cookie` sans `pulse_session`. En recette (R), capture de la ligne de journal de `auth_client` qui montre l'appel `GET /api/v1/auth/me` et son statut 200, sans jeton ni en-tête `Authorization` | à faire |
| REC-06 préférences pref-001 | F2-R02, F2-R06 | `e2e/rec-06` | à faire |
| REC-07 cycle d'un objectif | F3-R02, F3-R06, F3-R07 | `e2e/rec-07` | à faire |
| REC-08 rejoindre chl-005 | F4-R04 | `e2e/rec-08` | à faire |
| REC-09 refus sur chl-004 | F4-R05 | `e2e/rec-09` | à faire |
| REC-10 synthèse d'Alex | F5-R02 à R05 | `e2e/rec-10` | à faire |
| REC-11 accès admin de Léa | F6-R01, F1-R40 | `e2e/rec-11` | à faire |
| REC-12 USER refusé sur l'admin | F1-R28, F1-R41 | `e2e/rec-12` | à faire |
| REC-13 créer ou modifier un défi | F6-R03, F6-R05 | `e2e/rec-13` | à faire |

## Exigences sans critère du dossier

Ces exigences ne viennent d'aucun critère ACC ni scénario REC. Leur test porte alors l'identifiant de l'exigence.

| Exigence | Test | Niveau | Fichier | Statut |
|---|---|---|---|---|
| F1-R27 déconnexion | `f1_r27_deconnexion` : `DELETE /session` → 204 et `Set-Cookie` de `pulse_session` avec `Max-Age=0` | I | `api/f1_session` | à faire |
| F1-R29 origine et `Content-Type` | `f1_r29_origine_et_content_type` : sans session, `POST /me/goals` sans `Origin` ou avec une origine inconnue → 403 `ORIGIN_REJECTED`, pas 401 (l'origine passe avant la session, voir l'ordre des contrôles dans [api/endpoints.md](api/endpoints.md)) ; connecté, avec `Content-Type: text/plain` → 415 ; `POST /me/goals/goal-001/suspend` sans `Content-Type` → 200 | I | `api/security` | à faire |
| F2-R07 aucune préférence | `f2_r07_sans_preferences` : base sans pref-001 ; `GET` → 404, `PUT` → 200, puis `GET` → 200 avec les valeurs envoyées | I | `api/f2_preferences` | à faire |
| F2-R08 `participationDefis` sans effet | `f2_r08_participation_defis_sans_effet` : Alex passe `participationDefis` à `false` ; chl-005 garde `canJoin: true` et peut être rejoint | I | `api/f2_preferences` | à faire |
| F3-R09 pourcentage | `f3_r09_pourcentage_plafonne` : goal-001 (6250 / 8000) → 78 ; goal-002 (7,1 / 7,5) → 95 ; goal-006 (165 / 150) → 100, dépassement accepté | U | `dom/goal` | U fait, I à faire |
| F4-R02 participation exposée | `f4_r02_ma_participation` (Alex) : chl-001 → participation ACTIVE (part-001), `canJoin: false` ; chl-002 → LEFT (part-006), `canJoin: true` ; chl-004 → COMPLETED (part-007), `canJoin: false` ; chl-005 → `null`, `canJoin: true` ; chl-003 → `null`, `canJoin: false` | I | `api/f4_challenges` | à faire |
| F4-R07 rejoindre après LEFT | `f4_r07_rejoindre_apres_left` (ADR-20) : Alex rejoint chl-002 → 200 et une **nouvelle** participation ACTIVE (part-011, `progressValue` 0) ; part-006 reste LEFT en base | I | `api/f4_challenges` | à faire |
| F4-R10 défi inconnu | `f4_r10_defi_inconnu` : `GET`, `join` et `leave` sur `chl-999` → 404 `NOT_FOUND` | I | `api/f4_challenges` | à faire |
| F4-R11 statut jamais calculé | `f4_r11_statut_jamais_calcule` : avec une date du jour après la fin de chl-001 (2026-02-28), chl-001 reste OPEN et Mehdi le rejoint → 200 ; chl-003 reste UPCOMING | I | `api/f4_challenges` | à faire |
| F5-R06 aucune comparaison | Revue de `ProgressSummary` et de `/progression` : ni classement, ni moyenne, ni nombre de participants. L'absence de données d'autrui est testée par ACC-PROG-03 | R | — | à faire |
| F6-R06 défi CLOSED en lecture seule | `f6_r06_defi_closed_lecture_seule` : `PUT` sur chl-004 → 409 `INVALID_STATE`, défi inchangé ; passer chl-001 à CLOSED laisse part-001, part-002 et part-003 ACTIVE | U + I | `dom/challenge`, `api/f6_admin` | à faire |

## Règles de gestion → exigences

| Règle | Exigences |
|---|---|
| RG-AUTH-01 | F1-R20 à R25 |
| RG-AUTH-02 | F1-R06, F1-R23 (DISABLED reçu avec un 200) |
| RG-AUTH-03 | F1-R28, F1-R40 |
| RG-AUTH-04 | F1-R28, F6-R01 |
| RG-AUTH-05 | F6-R07, F6-R09 |
| RG-AUTH-06 | F1-R22, F1-R23, F1-R26 |
| RG-PREF-01 | F2-R01, F2-R05 |
| RG-PREF-02 à 04 | F2-R03, F2-R04 |
| RG-PREF-05 | F2-R03, F2-R08 |
| RG-GOAL-01 | F3-R01, F3-R08 |
| RG-GOAL-02 | F3-R02, F3-R04 |
| RG-GOAL-03 | F3-R03 |
| RG-GOAL-04 | F3-R07 (diagramme d'états) |
| RG-GOAL-05 | F3-R05, F3-R07 |
| RG-GOAL-06 | F3-R07 (réactivation, ADR-21) |
| RG-GOAL-07 | F3-R05, F3-R07 |
| RG-GOAL-08 | F3-R06 |
| RG-CHAL-01 | F4-R01 |
| RG-CHAL-02 | F4-R03, F4-R04 |
| RG-CHAL-03, 04 | F4-R05 |
| RG-CHAL-05 | F4-R06 |
| RG-CHAL-06 | F4-R08 (diagramme d'états) |
| RG-CHAL-07 | F4-R08 |
| RG-CHAL-08 | F4-R02, F4-R09 |
| RG-PROG-01 | F5-R01 |
| RG-PROG-02 | F5-R03 à R05 |
| RG-PROG-03 | F5-R03, F5-R07 |
| RG-PROG-04 | F5-R06, F4-R09 |
| RG-ADM-01 | F6-R01 |
| RG-ADM-02, 03 | F6-R03 à R05 |
| RG-ADM-04, 05 | F6-R08 |
| RG-ADM-06 | F6-R07 |
| RG-CONF-01, 02 | F2-R01, F3-R08, F4-R09, F5-R01, F6-R07 |
| RG-CONF-03 | [data-model.md](data-model.md) (seed HAC-DATA-001 uniquement) |
| RG-CONF-04 | Ton des textes, constitution §14 (R) |
