# Recette PULSE V1 (base du livrable L6)

Comment lire : **Auto** = couvert par `pnpm test` (`apps/api/test/api.test.ts`, `apps/auth-simulator/test/contract.test.ts`). **Manuel** = vérifié dans le navigateur.

| Scénario | Attendu | Auto | Manuel 2026-11-23 | Résultat |
|---|---|---|---|---|
| REC-01 Connexion Alex | Contexte USER, tableau de bord | ✅ | ✅ « Bonjour Alex », 2 objectifs actifs, 1 participation | OK |
| REC-02 Mauvais identifiants | 401, même message pour un compte connu ou inconnu | ✅ | – | OK |
| REC-03 Thomas Roy DISABLED | 403, message maîtrisé | ✅ | – | OK |
| REC-04 Service indisponible | `pnpm auth:down` → message « momentanément indisponible » | ✅ | ✅ | OK |
| REC-05 Vérification de session | `/api/auth/session` → `/me` | ✅ | ✅ (rechargement de page) | OK |
| REC-06 Préférences pref-001 | Modifier le moment préféré, valeur conservée | ✅ | – | OK |
| REC-07 Objectif | Créer, retrouver, progression, suspendre, clôturer | ✅ | – | OK |
| REC-08 Rejoindre un défi OPEN | chl-005 rejoint, participation visible | ✅ | ✅ | OK |
| REC-09 Défi CLOSED | chl-004 refusé (bouton absent + 409 côté API) | ✅ | ✅ | OK |
| REC-10 Synthèse | 5 j actifs, série de 4 j, états vides check-ins / hydratation | ✅ | ✅ | OK |
| REC-11 Accès admin Léa | Espace d'administration | ✅ | ✅ | OK |
| REC-12 USER sur l'admin | `/admin` → page « Droits insuffisants » ; API → 403 | ✅ | ✅ | OK |
| REC-13 Créer / modifier un défi | chl-007 créé puis modifié ; dates incohérentes refusées | ✅ | ✅ (erreur de date affichée sous le champ) | OK |

## Anomalies

| # | Gravité | Description | Statut |
|---|---|---|---|
| A-01 | Mineure | Bouton « Menu » mobile visible sur desktop (conflit CSS `.btn` / `.menu-toggle`) | Corrigée |

## Écarts et limites connues

- Jeton en `sessionStorage` (D-06) ; pas de révocation côté contrat : la déconnexion est seulement locale.
- La progression des défis est en lecture seule (ambiguïté n° 3).
- Stockage JSON mono-processus : pas de concurrence ni de transactions (sujet V2).
- Coque Tauri : non incluse dans la recette web ; elle demande la chaîne Rust.
