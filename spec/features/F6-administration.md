# F6 — Administration fonctionnelle simplifiée

- **Responsable** : Mael
- **User stories** : US-ADM-01 à 03 (MUST), US-ADM-04 (SHOULD)
- **Règles** : RG-ADM-01 à 06, RG-AUTH-04, 05
- **Décisions** : ADR-19, ADR-23, ADR-24

## Comportement

| Id | Exigence | Source |
|---|---|---|
| F6-R01 | Toutes les routes `/api/v1/admin/*` exigent FUNCTIONAL_ADMIN (F1-R28). Un USER reçoit **403 `FORBIDDEN`**, même en appel direct | RG-ADM-01, ACC-ADM-01, 02 |
| F6-R02 | L'admin consulte la liste des défis : titre, catégorie, statut, période, cible, unité | ACC-ADM-03, US-ADM-01 |
| F6-R03 | Création d'un défi : `title` (1–120), `category`, `description` (1–1000), `startDate`, `endDate` ≥ `startDate`, `targetValue` > 0, `unit` (1–30), `status` ∈ {OPEN, UPCOMING, CLOSED}. `createdBy` = admin de la session. Identifiant `chl-007`, puis la suite | RG-ADM-03, ACC-ADM-04, REC-13 |
| F6-R04 | Champ manquant, valeur incohérente (dates inversées, cible ≤ 0, statut inconnu) ou clé inconnue → 400 `VALIDATION_ERROR` avec `details` ; rien n'est enregistré | ACC-ADM-05 |
| F6-R05 | Modification d'un défi OPEN ou UPCOMING : mêmes règles. Le résultat est visible à la consultation suivante, côté admin **et** côté utilisateurs | ACC-ADM-06, REC-13 |
| F6-R06 | Un défi **CLOSED est en lecture seule** : PUT → 409 `INVALID_STATE` « Un défi terminé ne peut plus être modifié. ». Le passer à CLOSED ne touche pas aux participations existantes | UX p.10 (« Consulter »), ADR-19 |
| F6-R07 | **Aucune** route admin ne renvoie d'information sur les participants : ni noms, ni nombre, ni progression. Aucune route admin ne lit les tables `preferences`, `goals`, `participations` ou `metrics` | RG-ADM-06, ACC-GEN-07, ADR-23 |
| F6-R08 | *(SHOULD, après validation de F1 à F6)* Contenus : lister ; créer et modifier avec `title` (1–160), `type` ∈ {ARTICLE, FICHE, CONSEIL}, `category`, `status` ∈ {DRAFT, PUBLISHED}. Passer à PUBLISHED renseigne `publishedAt` = date du jour s'il était vide ; repasser à DRAFT le remet à `null`. `updatedAt` = date du jour à chaque modification | RG-ADM-04, 05, ACC-ADM-07, ADR-24 |
| F6-R09 | Un FUNCTIONAL_ADMIN qui appelle `/api/v1/me/*` reçoit 403 : l'admin n'a pas d'espace personnel dans PULSE V1 | RG-AUTH-05 |

## Écrans

### `/admin` — Défis (UX p.10)
- **En-tête sombre** « Administration PULSE » avec « Léa Bernard • FUNCTIONAL_ADMIN ».
- Onglets « Défis » et « Contenus (secondaire) », bouton « + Créer un défi ».
- **Tableau** : Titre, Catégorie, Statut, Période (« 01/02 → 28/02 »), Cible, Actions.
  - Action « Modifier » pour OPEN et UPCOMING.
  - Action « Consulter » pour CLOSED : formulaire en lecture seule.
- **Bandeau permanent** : « L'administration fonctionnelle ne donne aucun accès aux objectifs, préférences ou progressions individuelles. »
- **Formulaire de défi**, en panneau au-dessus du tableau :
  - champs titre, catégorie, statut, description, date de début, date de fin, cible, unité ;
  - aide sous le statut : « Seuls les défis ouverts peuvent être rejoints. » ;
  - mention « Tous les champs sont obligatoires. » ;
  - boutons « Enregistrer » et « Annuler ».

| État | Texte |
|---|---|
| Chargement | « Chargement des défis… » |
| Vide | « Aucun défi » — « Créez le premier défi proposé aux utilisateurs. » + bouton « Créer un défi » |
| Créé | « Défi créé. » |
| Modifié | « Défi modifié. » |
| Erreur de date | « La date de fin doit suivre la date de début. », sous « Date de fin » |
| Défi terminé | Formulaire désactivé et mention « Ce défi est terminé : il est consultable mais plus modifiable. » |

### `/admin/contenus` — Contenus (SHOULD)
- Tableau : Titre, Type (Article, Fiche, Conseil), Thème, Statut (Brouillon, Publié), Publié le, Actions « Modifier ».
- Formulaire : titre, type, thème, statut ; aide « Un brouillon n'est pas visible des utilisateurs. ».

| Action | Texte |
|---|---|
| Créer | « Contenu créé. » |
| Modifier | « Contenu modifié. » |

- **Accessibilité** :
  - le tableau a une légende (lisible par les lecteurs d'écran) et des en-têtes `scope="col"` ;
  - les boutons d'action portent le titre du défi (« Modifier 10 000 pas ensemble ») ;
  - sur mobile, le tableau défile horizontalement dans son conteneur.

## API

| Action | Endpoint | Codes |
|---|---|---|
| Lister les défis | `GET /api/v1/admin/challenges` | 200, 403 |
| Créer un défi | `POST /api/v1/admin/challenges` | 201, 400, 403 |
| Modifier un défi | `PUT /api/v1/admin/challenges/{id}` | 200, 400, 403, 404, 409 |
| Contenus | `GET`, `POST /api/v1/admin/contents` ; `PUT …/{id}` | 200, 201, 400, 403, 404 |

## Critères d'acceptation

| Critère | Exigences | Vérification | Test |
|---|---|---|---|
| ACC-ADM-01 / REC-11 | R01 | Intégration, E2E | `acc_adm_01_reserve_admin`, `rec_11` |
| ACC-ADM-02 / REC-12 | R01 | Intégration (GET et POST en direct), E2E (`/admin` → écran Accès refusé) | `acc_adm_02_user_refuse`, `rec_12` |
| ACC-ADM-03 | R02 | Intégration | `acc_adm_03_consulter_defis` |
| ACC-ADM-04 / REC-13 | R03, R05 | Intégration, E2E | `acc_adm_04_creer_modifier`, `rec_13` |
| ACC-ADM-05 | R04 | Unitaire, intégration | `acc_adm_05_controles_champs` |
| ACC-ADM-06 | R05 | Intégration | `acc_adm_06_modification_visible` |
| ACC-ADM-07 | R08 | Intégration (si fait) | `acc_adm_07_contenus` |

## Hors périmètre

- Suppression de défis ou de contenus.
- Corps rédactionnel des contenus.
- Gestion des comptes.
- Statistiques de participation.
