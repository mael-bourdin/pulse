# Consignes pour les agents IA

PULSE V1 (HealthAI Coach), projet MSPR de 4 personnes : réécriture en Rust (Axum, sqlx, PostgreSQL 16), React 19 + Vite, Tauri 2, avec un simulateur d'authentification qui respecte le contrat HAC-API-001. L'IA est autorisée comme assistant (CDC §9) ; chaque membre doit savoir expliquer ce qu'il fusionne.

## Avant de travailler

1. **Lire `tickets.json`** à la racine : c'est la copie du tableau Trello, tenue à jour à la main. Retrouver le ticket concerné (statut, priorité MoSCoW, propriétaire, exigences citées). Si la demande ne correspond à aucun ticket, ou si le ticket est déjà « En cours » chez quelqu'un d'autre, le signaler avant de commencer.
2. **Lire la spec** : `spec/` fait foi ([spec/README.md](spec/README.md) donne l'index). Le code et les tests découlent des exigences `Fx-Ryy` de `spec/features/`. Un comportement qui n'y figure pas se propose d'abord dans une PR de spec.
3. Respecter [spec/constitution.md](spec/constitution.md), non négociable, et les décisions de [spec/decisions.md](spec/decisions.md).
4. Partir de `develop` à jour : `git fetch origin && git switch -c <type>/<id>-<libellé> origin/develop`.

## Règles

- **Git** : personne ne pousse sur `main` ni sur `develop` ; tout passe par une PR relue. Titre de PR en convention Angular, `feat` et `fix` finissent par l'identifiant de spec : `feat(goals): suspendre un objectif [F3-R07]`. Le titre devient le commit au squash.
- **Aucune ligne de co-auteur IA** dans les commits ni les PR (ADR-26). Activer le hook une fois par clone : `git config core.hooksPath .githooks`.
- **Tests** : chaque test porte l'identifiant du critère qu'il vérifie (`acc_goal_06_…`, `REC-07`). Mettre à jour `spec/traceability.md` dans la même PR.
- **Sécurité** : aucun secret dans le dépôt, aucun mot de passe dans une réponse, un écran ou un journal. Les droits se vérifient dans l'API, l'identité vient uniquement du service d'auth. `pulse-api` n'appelle le simulateur que par HTTP.
- **Simplicité** : un seul style Rust, pas de macros maison, pas d'abstraction sans deuxième usage. N'écrire que ce que la spec demande.
- **Langue** : specs, messages d'interface et PR en français ; vouvoiement, ton sobre.
- Petites PR (moins de 400 lignes hors fichiers générés), une carte = une branche = une PR.

## Après le travail

- Dire quel ticket a avancé et ce qu'il reste à faire, pour que `tickets.json` et Trello soient mis à jour (par un humain : un agent ne modifie pas Trello).
- Lancer les vérifications locales avant de proposer un commit (`make check` dès que le socle Rust existe).
