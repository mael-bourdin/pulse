# F5 — Synthèse de progression

- **Responsable** : Simon
- **User stories** : US-PROG-01, US-PROG-02
- **Règles** : RG-PROG-01 à 04, RG-CONF-01, 02

## Comportement

| Id | Exigence | Source |
|---|---|---|
| F5-R01 | `GET /me/progress` ne renvoie que les données de l'utilisateur de la session | RG-PROG-01, ACC-PROG-01, 03 |
| F5-R02 | **Période** = celle de la métrique la plus récente de l'utilisateur (`periodStart`, `periodEnd`). S'il n'a aucune métrique : `period: null` | ACC-PROG-02 |
| F5-R03 | **Indicateurs affichés**, toujours ces 4 et dans cet ordre : WEEKLY_ACTIVE_DAYS, STREAK_DAYS, WELLBEING_CHECKINS, HYDRATION_DAYS. Pour chacun : libellé, valeur et unité, ou `value: null` s'il n'y a pas de donnée sur la période | RG-PROG-02, 03, ACC-PROG-02, 05 |
| F5-R04 | **Compteurs calculés depuis les données réelles** : objectifs ACTIVE, SUSPENDED et CLOSED ; participations ACTIVE | ACC-PROG-04 |
| F5-R05 | **Détail** : pour chaque objectif ACTIVE, libellé, valeur actuelle, cible, unité, % (règle F3-R09) ; pour chaque participation ACTIVE, titre du défi, valeur, unité | ACC-PROG-04 |
| F5-R06 | Aucun classement, aucune moyenne collective, aucune comparaison | RG-PROG-04 |
| F5-R07 | Une donnée absente n'est jamais une erreur : réponse 200 avec `null` ou une liste vide | RG-PROG-03, ACC-PROG-05 |

**Réponse** `ProgressSummary` :
```json
{ "period": { "start": "2026-02-09", "end": "2026-02-15" },
  "metrics": [ { "metricType": "WEEKLY_ACTIVE_DAYS", "label": "…", "value": 5, "unit": "jours" }, … ],
  "goals": { "active": 2, "suspended": 0, "closed": 1, "items": [ … ] },
  "challenges": { "active": 1, "items": [ { "challenge": { … }, "participation": { … } } ] } }
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
  - « Progression : 4 jours de suivi » → lien « Voir ma progression » ;
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
| ACC-PROG-04 | R04, R05 | Intégration | `acc_prog_04_objectifs_et_participations` |
| ACC-PROG-05 | R03, R07 | Intégration, E2E | `acc_prog_05_etats_vides` |

## Hors périmètre

- Saisie de nouvelles métriques.
- Historique sur plusieurs semaines.
- Graphiques d'évolution.
