# Ambiguïtés signalées

HAC-PROD-001 §11 demande de signaler les ambiguïtés au Produit avant de trancher. Ce registre alimente L1. Statut : *signalée* → *tranchée (ADR-xx ou exigence)* ou *validée par le Produit*. Relevées lors de la relecture des annexes du 2026-11-25, à vérifier en équipe.

| # | Ambiguïté | Source | Proposition | Statut |
|---|---|---|---|---|
| AMB-01 | US-CHAL-02/03 citent ACC-CHAL-09 et RG-CHAL-09, absents de HAC-ACC-001 et HAC-PROD-001 | BACKLOG | Ignorer ces renvois, le signaler | signalée |
| AMB-02 | Samira a `CHALLENGES_ACTIVE = 2` (met-004) alors que ses participations ACTIVE en donnent 3 ; F5 ignore les métriques `CHALLENGES_ACTIVE` et `GOALS_CLOSED` | DATA `06_Progression`, `05_Participations` ; ACC-PROG-02 | Calculer depuis les participations, jouer REC-10 avec Alex seulement | signalée |
| AMB-03 | RG-ADM-03 demande un « statut cohérent » avec les dates, ADR-19 laisse l'admin saisir n'importe quel statut | PROD p.5, ACC-ADM-05 | Écrire la règle de cohérence dans F6 et la faire valider | signalée |
| AMB-04 | Quand quitter un défi est-il « autorisé » ? | PROD OBJ-04, ACC-CHAL-07 | F4-R08 : seulement une participation ACTIVE | tranchée (F4-R08) |
| AMB-05 | La maquette p.8 propose « Rejoindre » sur chl-001 alors qu'Alex y participe ; p.9 affiche « 7 800 pas aujourd'hui » | UX p.8-9 | Suivre les données (`canJoin`, progression cumulée) | signalée |
| AMB-06 | Réactiver un objectif suspendu | RG-GOAL-06 | Autorisé | tranchée (ADR-21) |
| AMB-07 | Progression d'un défi modifiable par l'utilisateur ? | ACC-CHAL-08 | Lecture seule | tranchée (ADR-22) |
| AMB-08 | L'admin a-t-il un espace personnel ? | RG-AUTH-05 | Non | tranchée (ADR-27) |
| AMB-09 | Effet de `participationDefis` dans les préférences | PROD, F2-R08 | Aucun effet en V1, affiché seulement | signalée |
