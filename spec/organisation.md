# Organisation de la squad

## Rôles (proposition, Q11.1 non tranchée)

| Membre | Fonctionnalités | Rôle transverse |
|---|---|---|
| **Mael** | Socle (workspace, base, déploiement), F6 Administration | Pilote : planning, Trello, arbitrages, contact « Produit » ; référent hébergement ; admin du dépôt (rulesets, branche par défaut) |
| **Grégory** | F1 Authentification (simulateur + session PULSE) | Référent sécurité ([security.md](security.md)) |
| **Maxime** | F2 Préférences, F3 Objectifs | Référent recette et qualité ([testing.md](testing.md)) et CI ([ci.md](ci.md)) |
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

On ne coupe jamais : F1 à F6 (MUST), le simulateur conforme, les contrôles de droits, les REC en local, AA, la CI de base (`rust`, `web`, `secrets`) et la protection de `main` et `develop` (CDC §5.2, §5.6).
On coupe dans cet ordre, du premier au dernier :
1. App Tauri (bonus, CDC §6)
2. E2E WebKit et mobile (on garde Chromium bureau)
3. Critères AAA (on garde AA)
4. Contenus admin (SHOULD)
5. Génération des types TypeScript depuis l'OpenAPI (types écrits à la main)
6. Releases automatiques, environnement `staging` et E2E en CI ([release.md](release.md))
7. Mise en ligne Railway (démo locale)

## Trello

Tableau : https://trello.com/b/Ed35xHmf/mspr. Il est **régénéré à partir des specs** : une carte par exigence ou groupe d'exigences (`F3-R07 – …`), avec un lien vers la spec. Les anciennes cartes (`T-xxx`, code TypeScript) sont archivées (ADR-33).

### Colonnes

5 colonnes, les sprints sont des étiquettes (S0 à S3).

| Colonne | Une carte y entre quand… | Qui la déplace |
|---|---|---|
| Backlog | elle existe dans une spec | pilote |
| À faire | elle est retenue pour le sprint et respecte la définition de prêt | pilote, au début du sprint |
| En cours | sa branche est créée. **2 cartes au plus par personne** | auteur |
| En revue | sa PR est ouverte (hors brouillon) et la CI est verte. Le relecteur relit le code **et** vérifie le comportement (en local ou en ligne) | auteur |
| Terminé | la PR est fusionnée et respecte la définition de fini | relecteur |

- Une carte refusée en revue revient en « En cours », avec un commentaire qui dit ce qui ne va pas.
- Les cartes « Terminé » restent visibles avec leur étiquette de sprint (trace pour le jury).
- Le Power-Up **GitHub** de Trello rattache la branche et la PR à la carte.

### Format d'une carte

- **Titre** : `F3-R07 – Suspendre un objectif` (exigence), `BUG – <symptôme>` (anomalie), `TECH – <sujet>` (socle, CI, hébergement).
- **Membre** : une seule personne, celle qui porte la carte.
- **Étiquettes** : sprint (S0 à S3), fonctionnalité (Socle, F1 à F6), priorité **MoSCoW**, et si besoin « Anomalie », « Critique ».
- **Description** :

```
Spec : spec/features/F3-objectifs.md (F3-R07)
Critères : ACC-GOAL-06, REC-07
Estimation : 1 h 30
Dépend de : extracteur CurrentUser (F1)
```

### Priorité MoSCoW

Chaque carte porte une et une seule étiquette de priorité, reprise de HAC-BACKLOG-001 quand elle y figure :

| Étiquette | Sens pour PULSE V1 | Exemples |
|---|---|---|
| **MUST** | Exigé pour la revue de version : on ne le coupe jamais | F1 à F6, simulateur conforme, contrôles de droits, CI de base |
| **SHOULD** | Attendu si la capacité le permet (CDC « besoin secondaire ») | Contenus admin (F6) |
| **COULD** | Bonus, seulement après F1 à F6 validées (CDC §6) | App Tauri, critères AAA, E2E WebKit |
| **WON'T** | Écarté **pour V1**, gardé visible pour L7 (recommandations V2 et V3) | MongoDB, conteneurisation, pipeline CI/CD complet |

- Les cartes WON'T restent dans « Backlog » : elles montrent au jury ce qu'on a choisi de ne pas faire, et pourquoi.
- L'ordre de sacrifice (Priorités, ci-dessus) s'applique de COULD vers SHOULD, jamais aux MUST.

### Définition de prêt (avant « À faire »)

- L'exigence existe dans une spec fusionnée dans `develop`.
- Les critères ACC ou REC à tester sont identifiés.
- Les dépendances sont connues et prêtes (ou simulables).
- Elle est **estimée** (en heures) et tient en 3 h ; sinon on la découpe. Estimations et dépendances sont exigées pour le backlog opérationnel (HAC-BACKLOG-001, onglet « Lisez-moi »).

### Définition de fini (avant « Terminé »)

- Code et tests fusionnés dans `develop` par une PR approuvée, CI verte.
- Chaque test porte l'identifiant du critère qu'il vérifie.
- Comportement vérifié par un autre membre que l'auteur.
- `traceability.md` mis à jour dans la PR ; spec et README à jour si le comportement a changé.
- Aucune nouvelle violation axe sur les écrans touchés.

## Dépôt

On garde le **même dépôt** (`mael-bourdin/pulse`) : un premier commit supprime la V0 TypeScript, ce qui reste visible dans l'historique et montre la démarche au jury.

Le dépôt est **public** (vérifié le 2026-11-25), ce qui rend GitHub Actions et les rulesets gratuits (ADR-29). Les annexes du dossier (PDF, classeur `.xlsm`) **ne sont donc pas versionnées** : `docs/annexes/` est ignoré par Git et les annexes circulent sur Discord. Seules les données de référence `data/hac-data-001/` sont versionnées (données synthétiques, CDC §4.5).

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
