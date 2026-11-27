# Organisation de la squad

## Rôles (proposition, Q11.1 non tranchée)

| Membre | Fonctionnalités | Rôle transverse |
|---|---|---|
| **Mael** | Socle (workspace, base, déploiement), F6 Administration | Pilote : planning, Trello, arbitrages, contact « Produit » ; référent hébergement |
| **Grégory** | F1 Authentification (simulateur + session PULSE) | Référent sécurité ([security.md](security.md)) |
| **Maxime** | F2 Préférences, F3 Objectifs | Référent recette et qualité ([testing.md](testing.md)) |
| **Simon** | F4 Défis, F5 Progression | Référent interface et accessibilité ([accessibility.md](accessibility.md)) |

Chacun porte ses fonctionnalités **de bout en bout** : spec, domaine, API, écran, tests. Chacun **commite son propre code** (Q11.4).

## Planning (21 h)

| Sprint | Durée | Contenu | Fin de sprint quand… |
|---|---|---|---|
| S0 Socle | 4 h | 2 h de prise en main de Rust (tous) ; workspace, base, migrations, seed, squelette Axum et React, `make dev` (Mael) ; squelette du simulateur (Grégory) | `make dev` démarre chez les 4 |
| S1 Fonctionnalités | 9 h | En parallèle : F1 (Grégory), F2-F3 (Maxime), F4-F5 (Simon), F6 + déploiement Railway (Mael). F1 livre `CurrentUser` dès la 2ᵉ heure : les autres l'utilisent | Tests verts et démo de chaque fonctionnalité |
| S2 Recette | 4 h | E2E REC-01 à 13, axe, corrections, contenus (SHOULD) si F1–F6 sont validées | 13 REC verts en E2E local ; recette manuelle avec captures en ligne |
| S3 Livrables | 4 h | L1–L8, vidéo de secours, répétition | Répétition chronométrée faite |

Avant que F1 soit prête, les autres codent leur domaine et leurs tests unitaires, sans dépendre de la session.

## Priorités (ordre de sacrifice si le temps manque)

On ne coupe jamais : F1 à F6 (MUST), le simulateur conforme, les contrôles de droits, les REC en local, AA.
On coupe dans cet ordre, du premier au dernier :
1. App Tauri (bonus, CDC §6)
2. E2E WebKit et mobile (on garde Chromium bureau)
3. Critères AAA (on garde AA)
4. Contenus admin (SHOULD)
5. Génération des types TypeScript depuis l'OpenAPI (types écrits à la main)
6. Mise en ligne Railway (démo locale)

## Trello

- Le tableau garde 5 colonnes et une étiquette par sprint.
- Il est **régénéré à partir des specs** : une carte par exigence ou groupe d'exigences (`F3-R04 – …`), avec un lien vers la spec.
- Les anciennes cartes (code TypeScript) sont archivées.
- Étiquettes : sprint, fonctionnalité, MUST/SHOULD, « Anomalie », « Critique ».

## Dépôt

On garde le **même dépôt** (`mael-bourdin/pulse`) : un premier commit supprime la V0 TypeScript, ce qui reste visible dans l'historique et montre la démarche au jury. Les annexes du dossier sont copiées dans `docs/annexes/` (dépôt privé).

## Git

Détail dans [workflow.md](workflow.md). En résumé :
- `main` = version livrée, toujours démontrable ; `develop` = intégration. Personne ne pousse dessus directement.
- Une branche par carte depuis `develop` : `feat/F3-R07-suspendre-objectif`. PR relue par un autre membre, CI verte, fusion en squash.
- Titre de PR en convention Angular avec l'identifiant de la spec : `feat(goals): suspendre un objectif [F3-R07]`.
- Promotion `develop` → `main` en fin de sprint, en merge commit.
- `make check` avant chaque push. Pas de ligne de co-auteur IA (hook `commit-msg`).

## Rituels

- 10 min au début de chaque séance sur Discord : fait, à faire, bloquant.
- Fin de sprint : 15 min de démo interne, mise à jour de Trello et de `traceability.md`, puis PR de promotion vers `main`.
- Toute décision nouvelle → une ligne dans [decisions.md](decisions.md).

## IA

Autorisée comme assistant (CDC §9). On génère à partir des specs ; tout est relu, testé et expliqué par son auteur. L'usage est déclaré simplement dans L5 (ADR-25).

## Livrables

| Livrable | Forme | Responsable |
|---|---|---|
| L1 + L2 Prise en charge et pilotage | Un document ≤ 5 pages : synthèse, ambiguïtés, risques, backlog, rôles, planning, renvoi vers `decisions.md` | Mael |
| L3 Dépôt et environnement | README + `make setup/dev` + conventions ([workflow.md](workflow.md)) | Mael |
| L4 PULSE exécutable | En ligne (Railway) + local | Tous |
| L5 Note technique | README + `spec/` (architecture, sécurité, usage de l'IA, limites) | Grégory |
| L6 Dossier de recette | `docs/recette.md` exporté en PDF, ≤ 5 pages | Maxime |
| L7 + L8 Bilan, recommandations V2, support | Diaporama | Simon + tous |

## Soutenance (20 min)

| Durée | Contenu | Qui |
|---|---|---|
| 2 min | Contexte, objectifs | Mael |
| 2 min | Démarche, specs, organisation | Mael |
| 7 min | Démo : connexion, 401, 503, préférences, objectif, défi, progression, accès admin refusé, admin, smartphone, Tauri | Chacun sur sa fonctionnalité |
| 3 min | Architecture, sécurité, intégration de l'auth | Grégory |
| 2 min | Recette, anomalies connues, accessibilité | Maxime |
| 2 min | Difficultés, limites, recommandations V2 | Simon |
