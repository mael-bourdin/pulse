# Spécifications PULSE V1

Ici, **la spec fait foi.** Le code et les tests découlent de ces fichiers. Tout changement de comportement passe d'abord par une spec.

| Fichier | Contenu |
|---|---|
| [00-questionnaire.md](00-questionnaire.md) | Les réponses de l'équipe (source des décisions) |
| [constitution.md](constitution.md) | Règles non négociables |
| [architecture.md](architecture.md) | Composants, flux, organisation du code |
| [decisions.md](decisions.md) | Décisions d'architecture (ADR) |
| [ambiguites.md](ambiguites.md) | Ambiguïtés du dossier signalées au Produit (L1) |
| [data-model.md](data-model.md) | Schéma PostgreSQL, chargement de HAC-DATA-001 |
| [api/endpoints.md](api/endpoints.md) | API PULSE (REST `/api/v1`) |
| [api/auth.openapi.yaml](api/auth.openapi.yaml) | Contrat HAC-API-001 (écrit à la main) |
| [security.md](security.md) | Sécurité, confidentialité, journaux |
| [accessibility.md](accessibility.md) | AA garanti, AAA visé |
| [testing.md](testing.md) | Stratégie de tests et recette |
| [hosting.md](hosting.md) | Local, Railway, app Tauri |
| [organisation.md](organisation.md) | Rôles, planning, Trello, Git, livrables |
| [features/](features/) | Une spec par fonctionnalité, F1 à F6 |
| [traceability.md](traceability.md) | Correspondance règles → specs → tests → recette |

## Cycle de travail

1. Modifier ou créer la spec (`features/Fx-*.md`).
2. La faire relire par un autre membre.
3. Coder, en citant l'identifiant de la spec dans le commit.
4. Écrire les tests qui portent les identifiants ACC ou REC.
5. Mettre à jour [traceability.md](traceability.md).

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
