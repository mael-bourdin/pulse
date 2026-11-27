# Spécifications PULSE V1

Ici, **la spec fait foi.** Le code et les tests découlent de ces fichiers. Tout changement de comportement passe d'abord par une spec.

| Fichier | Contenu |
|---|---|
| [00-questionnaire.md](00-questionnaire.md) | Les réponses de l'équipe (source des décisions) |
| [constitution.md](constitution.md) | Règles non négociables |
| [architecture.md](architecture.md) | Composants, flux, organisation du code |
| [decisions.md](decisions.md) | Décisions d'architecture (ADR) |
| [data-model.md](data-model.md) | Schéma PostgreSQL, chargement de HAC-DATA-001 |
| [api/endpoints.md](api/endpoints.md) | API PULSE (REST `/api/v1`) |
| [api/auth.openapi.yaml](api/auth.openapi.yaml) | Contrat HAC-API-001 (écrit à la main) |
| [security.md](security.md) | Sécurité, confidentialité, journaux |
| [accessibility.md](accessibility.md) | AA garanti, AAA visé |
| [testing.md](testing.md) | Stratégie de tests et recette |
| [hosting.md](hosting.md) | Local, Railway, app Tauri |
| [workflow.md](workflow.md) | Branches, commits Angular, PR et revues, promotion, hotfix |
| [organisation.md](organisation.md) | Rôles, planning, Trello, Git, livrables |
| [features/](features/) | Une spec par fonctionnalité, F1 à F6 |
| [traceability.md](traceability.md) | Correspondance règles → specs → tests → recette |

## Cycle de travail

1. Modifier ou créer la spec (`features/Fx-*.md`) dans une PR `spec/…`, relue par un autre membre et fusionnée dans `develop`.
2. Créer la branche depuis `develop` ([workflow.md](workflow.md)).
3. Coder et écrire les tests qui portent les identifiants ACC ou REC.
4. Ouvrir la PR, titrée avec l'identifiant de la spec (`feat(goals): … [F3-R07]`), et mettre à jour [traceability.md](traceability.md) dedans. CI verte, relue, fusionnée en squash.
5. En fin de sprint, promotion `develop` → `main`.

## Références

| Abréviation | Document |
|---|---|
| CDC | Cahier des charges MSPR TPRE501 |
| PROD | HAC-PROD-001 |
| TECH | HAC-TECH-001 |
| API | HAC-API-001 |
| DATA | HAC-DATA-001 |
| ACC | HAC-ACC-001 |
| UX | HAC-UX-001 |
| BACKLOG | HAC-BACKLOG-001 |
