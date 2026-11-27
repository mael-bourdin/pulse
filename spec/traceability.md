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
| ACC-AUTH-05 | F1-R05, F1-R30 | I | `sim`, `api/f1_session` | à faire |
| ACC-AUTH-06 | F1-R06 | I | `sim` | à faire |
| ACC-AUTH-07 | F1-R07, F1-R12 | I | `sim` | à faire |
| ACC-AUTH-08 | F1-R08, F1-R09 | I | `sim` | à faire |
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
| ACC-GOAL-04 | F3-R04 | U + I | `dom/goal`, `api/f3_goals` | à faire |
| ACC-GOAL-05 | F3-R05 | U + I | `dom/goal`, `api/f3_goals` | à faire |
| ACC-GOAL-06 | F3-R07 | U + I | `dom/goal`, `api/f3_goals` | à faire |
| ACC-GOAL-07 | F3-R07 | U + I | `dom/goal`, `api/f3_goals` | à faire |
| ACC-GOAL-08 | F3-R06 | U + I | `dom/goal`, `api/f3_goals` | à faire |
| ACC-GOAL-09 | F3-R08 | I | `api/f3_goals` | à faire |

## F4 — Défis (ACC-CHAL)

| Critère | Exigences | Niveau | Fichier | Statut |
|---|---|---|---|---|
| ACC-CHAL-01 | F4-R01 | I | `api/f4_challenges` | à faire |
| ACC-CHAL-02 | F4-R01, écran `/defis` | I + E2E | `api/f4_challenges`, `e2e/rec-09` | à faire |
| ACC-CHAL-03 | F4-R03, F4-R04 | I | `api/f4_challenges` | à faire |
| ACC-CHAL-04 | F4-R04 | I | `api/f4_challenges` | à faire |
| ACC-CHAL-05 | F4-R06 | U + I | `dom/challenge`, `api/f4_challenges` | à faire |
| ACC-CHAL-06 | F4-R05 | U + I | `dom/challenge`, `api/f4_challenges` | à faire |
| ACC-CHAL-07 | F4-R08 | U + I | `dom/challenge`, `api/f4_challenges` | à faire |
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
| ACC-SEC-01 aucun secret versionné | [security.md](security.md) | R + outil (`make check`, scan de secrets) | — | à faire |
| ACC-SEC-02 mots de passe de démo jamais renvoyés | F1-R02, F1-R10 | I | `sim`, `api/security` | à faire |
| ACC-SEC-03 entrées validées | F1-R21, F2-R04, F3-R04, F6-R04, [api/endpoints.md](api/endpoints.md) (nombre en chaîne : `acc_sec_03_nombre_en_chaine_400`) | U + I | `dom/*`, `api/*` | à faire |
| ACC-SEC-04 autorisation côté serveur | F1-R28, F6-R01, F6-R09 | I | `api/f1_session`, `api/f6_admin` | à faire |
| ACC-SEC-05 réponses du service contrôlées | F1-R23 | I (faux service) | `api/f1_session` | à faire |
| ACC-SEC-06 400/401/403/503 distingués | F1-R22, F1-R26 | I | `api/f1_session` | à faire |
| ACC-SEC-07 pas de trace ni de chemin interne | F1-R11, F1-R31 | I | `api/security` | à faire |
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
| REC-05 vérification de session | F1-R25, F1-R42 | `e2e/rec-05` | à faire |
| REC-06 préférences pref-001 | F2-R02, F2-R06 | `e2e/rec-06` | à faire |
| REC-07 cycle d'un objectif | F3-R02, F3-R06, F3-R07 | `e2e/rec-07` | à faire |
| REC-08 rejoindre chl-005 | F4-R04 | `e2e/rec-08` | à faire |
| REC-09 refus sur chl-004 | F4-R05 | `e2e/rec-09` | à faire |
| REC-10 synthèse d'Alex | F5-R02 à R05 | `e2e/rec-10` | à faire |
| REC-11 accès admin de Léa | F6-R01, F1-R40 | `e2e/rec-11` | à faire |
| REC-12 USER refusé sur l'admin | F1-R28, F1-R41 | `e2e/rec-12` | à faire |
| REC-13 créer ou modifier un défi | F6-R03, F6-R05 | `e2e/rec-13` | à faire |

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
