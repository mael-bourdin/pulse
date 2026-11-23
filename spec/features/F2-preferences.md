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
| F2-R07 | Utilisateur sans préférences enregistrées : le GET renvoie 404 `NOT_FOUND`, et le PUT les crée | — |
| F2-R08 | `participationDefis = false` n'empêche pas de rejoindre un défi : c'est une préférence d'affichage (ambiguïté signalée dans L1) | RG-PREF-05 |

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
| Erreur de chargement | Alerte « Impossible de charger vos préférences. Réessayez. » + bouton « Réessayer » |
| Enregistrement | Bouton désactivé, « Enregistrement… » |
| Succès | Message « Vos préférences ont été enregistrées. » ; l'encadré de résumé se met à jour |
| Erreur de validation | Message sous le champ concerné |

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

## Hors périmètre

- Envoi réel de notifications ou de rappels.
- Modification de l'e-mail ou du nom, qui appartiennent au service d'auth.
