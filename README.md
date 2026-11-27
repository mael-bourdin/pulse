# PULSE V1 – Coach & Challenges

Premier incrément du programme PULSE de HealthAI Coach (MSPR TPRE501, bloc 1 CDA). Les utilisateurs gèrent leurs préférences, leurs objectifs, leurs défis et suivent leur progression ; les administrateurs fonctionnels gèrent les défis. Application web responsive, avec une app desktop Tauri en option.

## État

La V1 est en cours de réécriture en Rust. Les spécifications dans [spec/](spec/) font foi : commencer par [spec/README.md](spec/README.md). La première version en TypeScript reste dans l'historique Git.

## Stack

- API PULSE : Rust, Axum 0.8, sqlx 0.8, PostgreSQL 16
- Simulateur d'authentification (contrat HAC-API-001) : Rust, Axum 0.8
- Front : React 19, Vite, TypeScript
- Desktop : Tauri 2

Composants, flux, organisation du dépôt et configuration : [spec/architecture.md](spec/architecture.md).

## Hook Git

Le hook `.githooks/commit-msg` retire les lignes de co-auteur IA des messages de commit. À activer une fois après le clonage :

```bash
git config core.hooksPath .githooks
```

## Comptes de démonstration (HAC-DATA-001, données fictives)

| Compte | Mot de passe | Rôle / état | Scénario |
|---|---|---|---|
| alex.martin@demo.healthaicoach.fr | `DemoPassword!` | USER, ACTIVE | REC-01, 05–10, 12 |
| samira.benali@demo.healthaicoach.fr | `DemoPassword!` | USER, ACTIVE | – |
| thomas.roy@demo.healthaicoach.fr | `DemoPassword!` | USER, **DISABLED** | REC-03 (403) |
| lea.bernard@demo.healthaicoach.fr | `AdminDemo!` | FUNCTIONAL_ADMIN | REC-11, 13 |

Ce sont des identifiants de démonstration fournis par le dossier projet. Le simulateur ne les stocke qu'**hachés (Argon2id)** dans `crates/auth-simulator/data/users.json` et ne les renvoie jamais.

## Liens

- Suivi : https://trello.com/b/Ed35xHmf/mspr
- Maquettes : https://www.figma.com/design/56cn1gPfEJSQqI6xDowlo1/MSPR
