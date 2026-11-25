# F5 — Synthèse de progression

- **Responsable** : Simon
- **User stories** : US-PROG-01, US-PROG-02
- **Règles** : RG-PROG-01 à 04, RG-CONF-01, 02

## Comportement

| Id | Exigence | Source |
|---|---|---|
| F5-R01 | `GET /me/progress` ne renvoie que les données de l'utilisateur de la session | RG-PROG-01, ACC-PROG-01, 03 |
| F5-R02 | **Période** = celle de la métrique la plus récente de l'utilisateur, renvoyée en `period: { start, end }`. S'il n'a aucune métrique : `period: null` | ACC-PROG-02 |
| F5-R03 | **Indicateurs affichés**, toujours ces 4 et dans cet ordre : WEEKLY_ACTIVE_DAYS, STREAK_DAYS, WELLBEING_CHECKINS, HYDRATION_DAYS. Pour chacun : `label` et `unit` fixes (tableau ci-dessous), et `value`, ou `value: null` s'il n'y a pas de donnée sur la période | RG-PROG-02, 03, ACC-PROG-02, 05 |
| F5-R04 | **Compteurs calculés depuis les données réelles** : objectifs ACTIVE, SUSPENDED et CLOSED (table `goals`) ; participations ACTIVE (table `participations`). Les métriques `CHALLENGES_ACTIVE` et `GOALS_CLOSED` de DATA ne sont jamais lues | ACC-PROG-04 |
| F5-R05 | **Détail** : `goals.items` = les objectifs ACTIVE, au format `Goal` : libellé, valeur actuelle, cible, unité et `progressPercent` (F3-R09), calculé par le serveur et arrondi demi vers le haut. `challenges.items` = les défis où la participation est ACTIVE, au format `ChallengeView` : titre, unité et `myParticipation.progressValue` | ACC-PROG-04 |
| F5-R06 | Aucun classement, aucune moyenne collective, aucune comparaison | RG-PROG-04 |
| F5-R07 | Une donnée absente n'est jamais une erreur : réponse 200 avec `null` ou une liste vide | RG-PROG-03, ACC-PROG-05 |

**Indicateurs.** `label` et `unit` viennent de ce tableau, pas de la ligne `metrics`, pour exister même sans donnée. Ce sont les libellés de DATA.

| `metricType` | `label` | `unit` | Affiché sur |
|---|---|---|---|
| WEEKLY_ACTIVE_DAYS | Jours avec activité enregistrée | jours | carte « Jours actifs » |
| STREAK_DAYS | Série de suivi en cours | jours | carte « Série en cours » ; « 4 jours de suivi » du tableau de bord |
| WELLBEING_CHECKINS | Check-ins bien-être complétés | check-ins | carte « Check-ins bien-être » |
| HYDRATION_DAYS | Jours ayant atteint l'objectif hydratation | jours | carte « Jours objectif hydratation » |

Les métriques `CHALLENGES_ACTIVE` (met-004) et `GOALS_CLOSED` (met-006) de DATA ne sont ni affichées ni utilisées pour les compteurs (F5-R04), car elles peuvent contredire les données réelles : met-004 donne 2 défis actifs à Samira, alors que ses participations ACTIVE en donnent 3 (part-002, part-004, part-010). PULSE affiche 3. REC-10 se joue donc avec Alex, dont les données sont cohérentes. Écart à signaler dans L1.

**Réponse** `ProgressSummary`, dont les champs sont détaillés dans [api/endpoints.md](../api/endpoints.md#formes-de-réponse-principales) :
```json
{ "period": { "start": "2026-02-09", "end": "2026-02-15" },
  "metrics": [ { "metricType": "WEEKLY_ACTIVE_DAYS", "label": "Jours avec activité enregistrée", "value": 5, "unit": "jours" }, … ],
  "goals": { "active": 2, "suspended": 0, "closed": 1,
             "items": [ { "goalId": "goal-001", "label": "Atteindre 8000 pas par jour", "currentValue": 6250, "targetValue": 8000, "unit": "pas/jour", "progressPercent": 78, … } ] },
  "challenges": { "active": 1,
                  "items": [ { "challengeId": "chl-001", "title": "10 000 pas ensemble", "unit": "pas/jour", …,
                               "myParticipation": { "status": "ACTIVE", "joinedAt": "2026-02-01", "progressValue": 7800 }, "canJoin": false } ] } }
```

### Ce que voit Alex avec les données de départ (REC-10)

| Élément | Affichage |
|---|---|
| Période | « Semaine du 9 au 15 février » |
| Jours actifs | **5 jours** |
| Série en cours | **4 jours** |
| Check-ins bien-être | État vide : « Pas encore de donnée sur cette période. » |
| Jours objectif hydratation | État vide : « Pas encore de donnée sur cette période. » |
| Objectifs actifs | **2** |
| Défis actifs | **1** |
| Détail des objectifs | « Atteindre 8000 pas par jour » 78 % ; « Dormir au moins 7 h 30 par nuit » 95 % |
| Détail des défis | « 10 000 pas ensemble » — **7 800 pas/jour** |
| Mention | « Aucun classement entre salariés. » |

Si Alex rejoint chl-005 (REC-08), « Défis actifs » passe à 2.

## Écrans

### `/progression` (UX p.9)
- Titre « Ma progression », sous-titre = la période.
- **Rangée de cartes** : les 4 indicateurs, puis « Objectifs actifs » et « Défis actifs ».
- **Deux blocs** : « Objectifs » (une barre par objectif) et « Défis » (valeur par défi).

| État | Texte |
|---|---|
| Chargement | « Chargement de votre progression… » |
| Aucun objectif actif | « Aucun objectif actif » — « Créez un objectif pour suivre votre avancée ici. » + lien « Créer un objectif » |
| Aucune participation | « Aucune participation en cours » — « Rejoignez un défi ouvert pour le suivre ici. » + lien « Voir les défis » |
| Aucune période | Sous-titre « Une synthèse personnelle, simple et sans comparaison. » |

### `/` — Tableau de bord (UX p.5)
Il réutilise `/me/progress` et `/me/preferences`.
- Titre « Bonjour Alex », sous-titre « Voici un aperçu de votre espace personnel. ».
- **4 cartes** :
  - « Objectifs : 2 actifs » → lien « Voir mes objectifs » ;
  - « Défis : 1 participation active » → lien « Découvrir les défis » ;
  - « Progression : 4 jours de suivi » (valeur de STREAK_DAYS ; sans donnée, « Progression : pas encore de donnée ») → lien « Voir ma progression » ;
  - « Préférences : Activité, rappels le matin » → lien « Modifier mes préférences ».
- Note : « Votre espace est personnel : vos objectifs, défis et progression ne sont jamais visibles par votre employeur. »

- **Accessibilité** :
  - une valeur absente est écrite en toutes lettres, jamais « 0 » ni « — » seuls ;
  - les cartes ont une structure titre + valeur lisible par un lecteur d'écran ;
  - les barres de progression ont un libellé.

## API

| Action | Endpoint | Codes |
|---|---|---|
| Synthèse | `GET /api/v1/me/progress` | 200 |

## Critères d'acceptation

| Critère | Exigences | Vérification | Test |
|---|---|---|---|
| ACC-PROG-01 | R01 | Intégration | `acc_prog_01_synthese_personnelle` |
| ACC-PROG-02 / REC-10 | R02, R03 | Intégration, E2E | `acc_prog_02_valeurs_data_alex`, `rec_10` |
| ACC-PROG-03 | R01 | Intégration (Alex ne reçoit rien de `usr-10028`) | `acc_prog_03_pas_les_donnees_d_autrui` |
| ACC-PROG-04 | R04, R05 | Unitaire (arrondi : 12,5 → 13), intégration | `acc_prog_04_objectifs_et_participations`, `acc_prog_04_arrondi_demi_vers_le_haut` |
| ACC-PROG-05 | R03, R07 | Intégration, E2E | `acc_prog_05_etats_vides` |

## Hors périmètre

- Saisie de nouvelles métriques.
- Historique sur plusieurs semaines.
- Graphiques d'évolution.
