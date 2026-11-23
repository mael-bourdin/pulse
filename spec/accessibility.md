# Accessibilité

Objectif : **WCAG 2.2 AA garanti**, **AAA visé** partout où c'est réaliste. Responsable : **Simon** (référent interface et accessibilité).

## Garanti (AA), vérifié automatiquement

- Le test `axe` (Playwright) passe sans violation sur chaque écran de la recette.
- Tout fonctionne au clavier ; le focus est toujours visible ; un lien « Aller au contenu » est présent.
- Chaque champ a un libellé ; les champs obligatoires sont signalés ; l'erreur s'affiche **sous le champ**, reliée par `aria-describedby`.
- Les messages (succès, erreur) sont annoncés par `role="status"` ou `role="alert"`.
- L'interface est utilisable de 320 px à 1440 px, sans défilement horizontal (sauf les tableaux admin, qui défilent dans leur cadre) ; le zoom à 200 % reste utilisable.
- Les statuts ne sont jamais portés par la seule couleur (texte du badge).

## Visé (AAA), à vérifier en recette

| Critère AAA | Comment |
|---|---|
| 1.4.6 Contraste renforcé 7:1 | Palette conçue pour 7:1 sur le texte courant (teal foncé `#0B5E57` sur blanc) |
| 2.5.5 Taille des cibles 44×44 px | Boutons et liens d'action à 44 px de haut minimum |
| 2.2.3 Pas de limite de temps | Aucune action chronométrée ; un toast reste 6 s et peut être relu dans la zone d'état |
| 3.3.5 Aide contextuelle | Texte d'aide sous les champs sensibles (valeur cible, dates) |
| 2.4.10 Titres de section | Chaque bloc a un titre ; hiérarchie h1 → h2 → h3 sans saut |
| 3.1.5 Niveau de lecture | Phrases courtes, vocabulaire courant, pas de jargon (PROD §8) |
| 2.3.3 Animations | Aucune animation non déclenchée par l'utilisateur ; `prefers-reduced-motion` respecté |

Critères AAA **non visés**, à justifier dans L6 : 1.2.x (pas de vidéo), 3.1.3 et 3.1.4 (pas de jargon à définir).

## Vérification

- `e2e/a11y.spec.ts` : axe sur chaque route, en tant qu'Alex puis Léa.
- Recette manuelle : parcours au clavier, VoiceOver (macOS) sur la connexion et les objectifs, zoom à 200 %, smartphone réel.
