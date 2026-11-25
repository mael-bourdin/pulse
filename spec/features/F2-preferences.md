# F2 — Profil et préférences

- **Responsable** : Maxime
- **User stories** : US-PREF-01, US-PREF-02
- **Règles** : RG-PREF-01 à 05, RG-CONF-01

## Comportement

| Id | Exigence | Source |
|---|---|---|
| F2-R01 | `GET /me/preferences` renvoie **uniquement** les préférences de l'utilisateur de la session | RG-PREF-01, ACC-PREF-01, 06 |
| F2-R02 | Valeurs initiales identiques à DATA. Pour Alex (pref-001) : ACTIVITE, notifications oui, QUOTIDIEN, MATIN, défis oui | ACC-PREF-02, REC-06 |
| F2-R03 | `PUT /me/preferences` exige les 5 champs : `themePrioritaire` ∈ {ACTIVITE, SOMMEIL, HYDRATATION, STRESS, NUTRITION}, `frequenceRappel` ∈ {QUOTIDIEN, HEBDOMADAIRE, AUCUN}, `momentPrefere` ∈ {MATIN, MIDI, SOIR}, `notifications` et `participationDefis` booléens | RG-PREF-02 à 05, ACC-PREF-03 |
| F2-R04 | Valeur hors liste, champ manquant ou mauvais type → 400 `VALIDATION_ERROR`, avec `details[].field` ; rien n'est enregistré | ACC-PREF-05, ACC-SEC-03 |
| F2-R05 | Une clé inconnue, en particulier `userId` ou `preferenceId`, → 400. On ne peut **pas** viser un autre utilisateur | ACC-PREF-06 |
| F2-R06 | Une modification valide est enregistrée en base et reste visible après rechargement ou reconnexion | ACC-PREF-04 |
| F2-R07 | Utilisateur sans préférences enregistrées : le GET renvoie 404 `NOT_FOUND` et ne crée rien. Le PUT est un **upsert** : il crée les préférences si elles sont absentes (identifiant `pref-006`, puis la suite) et répond 200 dans les deux cas. Côté écran, ce 404 donne l'état « Aucune préférence » (voir Écrans) | UX p.11 (état vide) |
| F2-R08 | `participationDefis` est **enregistré et affiché**, sans aucun effet en V1 : la valeur `false` ne masque, ne filtre et ne bloque aucun défi. F4 l'ignore : `canJoin` reste calculé par F4-R03 et un défi OPEN reste joignable. HAC-PROD-001 demande seulement que l'utilisateur puisse « indiquer s'il souhaite participer aux défis » (RG-PREF-05) et veut qu'il puisse « rejoindre des défis sans contrainte » (§4.1). Limite connue, signalée dans L1 | RG-PREF-05, PROD §4.1 |

## Écrans

### `/preferences` (UX p.6)
- Titre « Mes préférences », sous-titre « Ces paramètres personnalisent votre expérience PULSE. »
- **Encadré « Profil de référence »** : nom, e-mail, et un résumé des valeurs **enregistrées** :
  - « Thème prioritaire : Activité » ;
  - « Notifications : activées » ;
  - « Rappel : Quotidien, le matin » ;
  - « Participation aux défis : oui ».
- **Formulaire** :
  - listes « Thème prioritaire », « Fréquence de rappel », « Moment préféré » ;
  - interrupteurs « Notifications » et « Participer aux défis » (`role="switch"`) ;
  - bouton « Enregistrer les modifications ».
- Libellés affichés : Activité, Sommeil, Hydratation, Gestion du stress, Nutrition ; Quotidien, Hebdomadaire, Aucun rappel ; Matin, Midi, Soir.

| État | Comportement |
|---|---|
| Chargement | « Chargement de vos préférences… » (`role="status"`) |
| Aucune préférence (GET → 404 `NOT_FOUND`) | Formulaire avec les valeurs par défaut, voir ci-dessous. Ce n'est pas une erreur |
| Erreur de chargement (autre que 404) | Alerte « Impossible de charger vos préférences. Réessayez. » + bouton « Réessayer » |
| Enregistrement | Bouton désactivé, « Enregistrement… » |
| Succès | Message « Vos préférences ont été enregistrées. » ; l'encadré de résumé se met à jour |
| Erreur de validation | Message sous le champ concerné |

- **Aucune préférence** (F2-R07) :
  - message au-dessus du formulaire : « Vous n'avez pas encore enregistré de préférences. Vérifiez les valeurs proposées puis enregistrez-les. » ;
  - valeurs par défaut : Activité, notifications désactivées, Aucun rappel, Matin, participation aux défis non. Rien n'est activé sans action de l'utilisateur ;
  - l'encadré affiche le nom, l'e-mail et « Aucune préférence enregistrée » à la place du résumé, puisqu'il ne montre que des valeurs enregistrées ;
  - « Enregistrer les modifications » envoie le PUT, qui crée les préférences, puis l'écran passe à l'état Succès.

- **Accessibilité** : chaque liste a un libellé visible ; le message de succès est annoncé par `aria-live="polite"` ; sur mobile, l'encadré passe au-dessus du formulaire.

## API

| Action | Endpoint | Codes |
|---|---|---|
| Consulter | `GET /api/v1/me/preferences` | 200, 401, 403, 404 |
| Modifier | `PUT /api/v1/me/preferences` | 200, 400, 401, 403 |

## Critères d'acceptation

| Critère | Exigences | Vérification | Test |
|---|---|---|---|
| ACC-PREF-01 | R01 | Intégration | `acc_pref_01_consulter_ses_preferences` |
| ACC-PREF-02 | R02 | Intégration | `acc_pref_02_valeurs_initiales_data` |
| ACC-PREF-03 | R03 | Intégration | `acc_pref_03_modifier` |
| ACC-PREF-04 / REC-06 | R06 | Intégration, E2E | `acc_pref_04_persistance`, `rec_06` |
| ACC-PREF-05 | R04 | Unitaire (domaine), intégration | `acc_pref_05_valeur_hors_liste_refusee` |
| ACC-PREF-06 | R01, R05 | Intégration | `acc_pref_06_pas_d_autre_utilisateur` |
| — | R07 | Intégration, E2E | `f2_r07_sans_preferences` (base sans pref-001 : GET → 404, PUT → 200, GET → 200 avec les valeurs envoyées) ; `test('F2-R07 — aucune préférence', …)` (GET simulé en 404 : valeurs par défaut, message, puis Succès) |
| — | R08 | Intégration | `f2_r08_participation_defis_sans_effet` (Alex passe `participationDefis` à `false` : chl-005 garde `canJoin = true` et peut être rejoint) |

## Hors périmètre

- Envoi réel de notifications ou de rappels.
- Tout effet de `participationDefis` sur les défis (masquage, filtre, suggestion) : limite connue de V1 (F2-R08).
- Modification de l'e-mail ou du nom, qui appartiennent au service d'auth.
