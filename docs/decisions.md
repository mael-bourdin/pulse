# Journal des arbitrages – PULSE V1

Décisions prises par la Squad, dans la latitude laissée par HAC-PROD-001 §9. À compléter au fil des itérations (date, décision, raison, alternatives).

| # | Date | Décision | Raison | Alternatives écartées |
|---|---|---|---|---|
| D-01 | 2026-11-23 | Front **web responsive** React + Vite. **Tauri v2** sert seulement de coque desktop optionnelle autour du même front | Le CDC impose une application web responsive (§3, HAC-PROD-001 §2). L'équipe souhaitait Tauri : on le garde sans en dépendre pour la démo | Tauri seul (pas « web »), Tauri mobile (le mobile natif est hors périmètre) |
| D-02 | 2026-11-23 | API métier Node/Express séparée du front | Les droits doivent être contrôlés côté serveur, pas seulement dans l'interface (ACC-AUTH-15, ACC-SEC-04). Une API isolée prépare V2 (REST/OpenAPI) | Logique dans le front, ou dans des commandes Rust Tauri (absentes en web) |
| D-03 | 2026-11-23 | TypeScript partout, schémas zod partagés front/API | Une seule source pour les référentiels (RG-PREF-02..04, RG-GOAL-02, RG-ADM-03) ; un seul langage pour toute la squad | Java/Spring (socle historique) : trop coûteux pour 21 h ; à réévaluer en V2 |
| D-04 | 2026-11-23 | Stockage = fichier JSON local initialisé depuis HAC-DATA-001 | « Stockage simple » autorisé (CDC §3.6). La persistance cible relève de V2 | SQLite, PostgreSQL |
| D-05 | 2026-11-23 | Le front ne parle qu'à l'API ; l'API relaie `/login` et valide chaque requête via `/me` (cache 15 s) | Une seule zone de couplage avec le service d'auth (ACC-QUAL-02), identité toujours issue du service | Front appelant directement le simulateur |
| D-06 | 2026-11-23 | Jeton stocké en `sessionStorage` | Simple, effacé à la fermeture de l'onglet. Risque XSS accepté en V1 (aucun HTML injecté, React échappe tout) | Cookie httpOnly via BFF : recommandé en V2 |
| D-07 | 2026-11-23 | 503 simulé par un fichier drapeau (`pnpm auth:down` / `auth:up`) | Reproductible, documenté, sans redémarrage (HAC-API-001 §9) | Endpoint d'administration du simulateur (sort du contrat) |
| D-08 | 2026-11-23 | Mots de passe de démo stockés **hachés (scrypt)** dans le simulateur, comparaison à temps constant, hachage factice si l'e-mail est inconnu | Pas d'oracle sur l'existence d'un compte (§4.4), bonne pratique même pour un simulateur | Mots de passe en clair dans le JSON |
| D-09 | 2026-11-23 | Rejoindre un défi après une sortie (LEFT) **crée une nouvelle participation** | Conserve l'historique ; laissé au choix de la Squad (HAC-PROD-001 §6.4 nb) | Réactiver l'ancienne participation |
| D-10 | 2026-11-23 | Réactivation d'un objectif SUSPENDED → ACTIVE autorisée ; CLOSED est terminal | RG-GOAL-06 l'autorise si cohérent avec l'UX | Pas de réactivation |
| D-11 | 2026-11-23 | Seul un objectif ACTIVE est modifiable et voit sa progression mise à jour | Lecture stricte de RG-GOAL-05 | Modifier aussi un SUSPENDED |
| D-12 | 2026-11-23 | Rôle FUNCTIONAL_ADMIN refusé sur l'espace personnel (`/api/me/*`), USER refusé sur `/api/admin/*` | Espaces distincts (RG-AUTH-04/05, parcours UX P1 → P6) | Admin ayant aussi un espace personnel |
| D-13 | 2026-11-23 | Le statut d'un défi est saisi par l'admin (pas déduit des dates) ; seule contrainte : fin ≥ début | Les données de référence ont des statuts incohérents avec la date du jour (chl-001 OPEN en février 2026) | Calcul automatique du statut |
| D-14 | 2026-11-23 | Un objet d'un autre utilisateur renvoie **404**, pas 403 | Ne révèle pas l'existence de la ressource (ACC-GOAL-09) | 403 |

## Ambiguïtés relevées (à faire valider par le Produit / la Technique)

1. **Préférence « participer aux défis » = non** : faut-il bloquer l'inscription ? *Hypothèse V1 : non bloquant, c'est une préférence d'affichage.*
2. **Statut des défis vs dates** : chl-001 est OPEN alors que sa période est passée (D-13).
3. **Progression des défis** : aucune règle ne dit comment la `progressValue` évolue. *Hypothèse V1 : lecture seule, valeur fournie par les données.*
4. **Métriques** : on affiche la dernière période disponible ; il n'y a pas d'historique multi-semaines dans HAC-DATA-001.
5. **US-CHAL-02/03** citent ACC-CHAL-09 et RG-CHAL-09, absents de HAC-ACC-001 et HAC-PROD-001 : références à corriger côté Produit.

## Ajouts

| # | Date | Décision | Raison | Alternatives écartées |
|---|---|---|---|---|
| D-15 | 2026-11-23 | Suivi de projet sur **Trello** (https://trello.com/b/Ed35xHmf/mspr) : 5 colonnes Kanban (Backlog, À faire, En cours, En revue, Terminé) ; une étiquette par sprint et une par epic | Outil déjà utilisé par l'équipe, gratuit, suffisant pour 21 h | Jira (non activé sur le site Atlassian) |
| D-16 | 2026-11-23 | Direction artistique « Rythme » : la semaine affichée comme 7 pulsations | Régularité plutôt que performance, pas de ton médical, pas de comparaison | Grille de cartes KPI des maquettes de référence |
| D-17 | 2026-11-23 | La bande de la semaine répartit les totaux HAC-DATA-001 (5 jours actifs, série de 4) : lundi actif, mardi et mercredi inactifs, jeudi à dimanche actifs | Le jeu de données ne donne pas le détail par jour : on affiche une répartition cohérente avec les totaux | Inventer des valeurs quotidiennes ; ne rien afficher |
