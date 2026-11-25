# PULSE V1 — Questionnaire

Répondez sous chaque question. « OK » = vous validez la proposition (→). Commencez par la section 0.

---

## 0. Intention

**Q0.1** Pourquoi Tauri ? Est-ce exigé par le formateur ?
Réponse : Un des seuls frameworks cross-platform en Rust, léger et compilé.

**Q0.2** Niveau de chacun (jamais / bases / à l'aise) :

| | Rust | React/TS | Git |
|---|---|---|---|
| Mael | jamais | à l'aise | à l'aise |
| Grégory | jamais | à l'aise | à l'aise |
| Maxime | jamais | à l'aise | à l'aise |
| Simon | jamais | à l'aise | à l'aise |

**Q0.3** Une soutenance réussie, pour vous, c'est quoi ?
Réponse : Capter l'attention du jury, qu'il comprenne le projet, l'apprécie et voie le travail derrière.

**Q0.4** Le code TypeScript existant : on le garde, on le porte en Rust, ou on repart de zéro ?
→ Ça dépend de Q0.2 : Rust si au moins 2 membres le connaissent, sinon on garde le TS.
Réponse : On repart de zéro, on ne garde pas le TypeScript.

**Q0.5** Comment justifier Rust alors que le SI de HealthAI est en Java ?
→ PULSE est un composant indépendant, branché uniquement par des contrats HTTP.
Réponse : Cross-platform, léger, compilé ; envie de tester une technologie en vogue.

## 1. Cible

**Q1.1** La démo se fait dans le navigateur, dans l'app Tauri, ou les deux ?
→ Navigateur pour F1–F6, Tauri montré en bonus à la fin (le CDC n'autorise les extras qu'après F1–F6).
Réponse : (non tranché) → proposition retenue : navigateur + Tauri.

**Q1.2** L'app Tauri doit tourner sur quels OS ?
→ Uniquement ceux de vos postes.
Réponse : macOS.

**Q1.3** Démo en local ou en ligne ?
→ Local, avec une vidéo de secours.
Réponse : En ligne, et en local si possible.

**Q1.4** L'app Tauri affiche l'URL servie par l'API, ou embarque sa propre interface ?
→ Elle affiche l'URL de l'API : c'est la seule option sans souci de session.
Réponse : (non répondu) → proposition retenue.

**Q1.5** Sur quelle machine se fait la démo (OS, Rust installé ou non) ?
Réponse : Un Mac.

## 2. Architecture

**Q2.1** Une seule API découpée en modules (monolithe), ou plusieurs services ?
→ Monolithe modulaire + le simulateur d'auth à part.
Réponse : Monolithe modulaire.

**Q2.2** Les règles métier sont isolées dans un module pur, sans HTTP ni base ?
→ Oui.
Réponse : Oui.

**Q2.3** Un seul dépôt pour tout (monorepo) ?
→ Oui.
Réponse : Oui.

## 3. Stack

**Q3.1** Quel framework Rust pour l'API ?
→ Axum 0.8.
Réponse : À proposer → Axum 0.8.

**Q3.2** Quel framework front ?
→ React + Vite (l'existant).
Réponse : React + Vite, on veut du performant.

## 4. API

**Q4.1** Quel style d'API ?
→ REST JSON sous `/api/v1`.
Réponse : REST.

**Q4.2** Le contrat OpenAPI est écrit à la main, ou généré depuis le code ?
→ Généré pour PULSE ; écrit à la main pour l'auth, puisqu'il est imposé.
Réponse : Généré pour PULSE, à la main pour l'auth.

**Q4.3** Quel format d'erreur ?
→ `{ code, message }`, comme HAC-API-001.
Réponse : OK.

**Q4.4** Quel code renvoyer quand l'accès est refusé ?
→ 404 pour la ressource d'un autre utilisateur, 403 pour un rôle insuffisant.
Réponse : OK (404 / 403).

## 5. Authentification

**Q5.1** Le simulateur est écrit dans le même langage que l'API ?
→ Oui.
Réponse : Oui.

**Q5.2** Comment provoquer le 503 ?
→ Commande `auth:down` / `auth:up`, sans redémarrage.
Réponse : Peu importe → proposition retenue.

**Q5.3** Le front appelle-t-il le simulateur directement, ou seulement via l'API PULSE ?
→ Seulement via l'API PULSE.
Réponse : Via l'API PULSE uniquement.

**Q5.4** Où garder la session côté navigateur ?
→ Cookie httpOnly (si Q1.4 = URL de l'API).
Réponse : Cookie httpOnly.

**Q5.5** Que voit l'utilisateur quand sa session expire ou que le service tombe ?
→ Expirée : retour à la connexion. Service tombé : message, sans déconnexion.
Réponse : Un message d'erreur.

**Q5.6** Que fait PULSE si le service renvoie une réponse invalide ?
→ Il la traite comme « service indisponible ».
Réponse : OK, service indisponible.

## 6. Sécurité

**Q6.1** Les mots de passe de démo sont stockés hachés dans le simulateur ?
→ Oui (Argon2).
Réponse : Oui.

**Q6.2** Faut-il limiter les tentatives de connexion ?
→ Oui, par adresse IP (jamais par e-mail, pour ne pas révéler qu'un compte existe).
Réponse : Oui.

**Q6.3** Que contiennent les logs ?
→ Méthode, route, statut. Jamais de jeton ni de donnée personnelle.
Réponse : Tout sauf données personnelles et jetons.

## 7. Données et règles

**Q7.1** Quel stockage ?
→ Fichier JSON (comme aujourd'hui). La vraie base de données est pour la V2.
Réponse : PostgreSQL.

**Q7.2** Rejoindre un défi qu'on a quitté crée une nouvelle participation ?
→ Oui.
Réponse : Oui.

**Q7.3** Peut-on réactiver un objectif suspendu ?
→ Oui. Un objectif clôturé reste définitif.
Réponse : Oui.

**Q7.4** La progression d'un défi est-elle modifiable par l'utilisateur ?
→ Non, lecture seule : ACC-CHAL-08 demande seulement de la consulter.
Réponse : Non.

**Q7.5** Le statut d'un défi est saisi par l'admin, ou calculé depuis les dates ?
→ Saisi par l'admin (les données datent de février 2026).
Réponse : Saisi par l'admin.

**Q7.6** Que voit l'admin des participants : rien, un nombre, ou des noms ?
→ Rien (RG-ADM-06).
Réponse : Rien.

**Q7.7** Gère-t-on les contenus (fonction optionnelle) ?
→ Seulement si F1–F6 sont terminés.
Réponse : Suivre le cahier des charges (SHOULD).

## 8. Interface

**Q8.1** Quelle référence visuelle ?
→ Les maquettes HAC-UX-001.
Réponse : Maquettes HAC-UX-001.

**Q8.2** Quel niveau d'accessibilité vise-t-on ?
→ WCAG AA sur les parcours de la démo.
Réponse : Le plus accessible possible : AAA si possible.

**Q8.3** Tutoiement ou vouvoiement ?
→ Vouvoiement.
Réponse : Vouvoiement.

## 9. Hébergement

**Q9.1** Faut-il héberger quelque chose en ligne ?
→ Non.
Réponse : Oui.

**Q9.2** Utilise-t-on Docker ?
→ Non.
Réponse : Non.

**Q9.3** La CI GitHub est bloquée par la facturation : on règle la facturation, on crée une organisation GitHub d'équipe, ou on passe par des hooks locaux ?
Réponse : Pas de CI requise ; à proposer.

## 10. Qualité

**Q10.1** Chaque test porte-t-il l'identifiant du critère qu'il vérifie (ex. ACC-GOAL-04) ?
→ Oui.
Réponse : Oui.

**Q10.2** Quels tests ?
→ Unitaires, intégration de l'API, E2E navigateur sur les 13 scénarios de recette.
Réponse : Unitaires, E2E, et tests sur toutes les recettes.

**Q10.3** Les 48 tests existants servent-ils de filet commun aux versions TypeScript et Rust ?
→ Oui.
Réponse : Non, on supprime l'existant.

**Q10.4** Où consigner les anomalies ?
→ Étiquette « Anomalie » sur Trello, recopiée dans le dossier de recette (L6).
Réponse : (non répondu) → proposition retenue.

**Q10.5** L'usage de l'IA est-il déclaré dans la note technique (L5) ?
→ Oui.
Réponse : Oui, simplement, sans détailler partout (réponse précisée ensuite).

## 11. Équipe

**Q11.1** Qui est PO, pilote, référent technique, référent recette ?
Réponse : Ne sait pas → à proposer.

**Q11.2** On découpe le travail par fonctionnalité, de bout en bout ?
→ Oui, comme sur Trello : Grégory F1, Maxime F2-F3, Simon F4-F5, Mael socle et F6.
Réponse : Oui.

**Q11.3** Combien de séances, de quelle durée, et quelle date de soutenance ?
Réponse : 21 h ; soutenance en fin d'année.

**Q11.4** Chacun commite son propre code ?
→ Oui (le jury lit l'historique).
Réponse : Oui.

**Q11.5** Quels outils utilisez-vous déjà (communication, support de soutenance) ?
Réponse : Discord ; diaporama + document.

## 12. Livrables et soutenance

**Q12.1** Quel format pour les livrables ?
→ L1+L2 fusionnés, L5 dans le README, L7+L8 dans le support de soutenance, en PDF.
Réponse : (non répondu) → proposition retenue.

**Q12.2** Comment se déroule la démo ?
→ En direct, avec le 401 et le 503, un test sur smartphone et une vidéo de secours.
Réponse : (non répondu) → proposition retenue.

## 13. Risques

**Q13.1** Quels risques voyez-vous ?
Réponse : Surtout la sécurité.

**Q13.2** Plan B si le Rust prend du retard ?
→ Si REC-01 à REC-05 ne passent pas en Rust à la fin de la séance 2, on livre le TypeScript.
Réponse : Pas de plan B : on ne prendra pas de retard.

**Q13.3** Autre chose (consignes du formateur…) ?
Réponse : Respecter au maximum le cahier des charges.

## 14. Workflow, CI et déploiement (ajouté le 2026-11-25)

Propositions détaillées dans [workflow.md](workflow.md) et [ci-cd.md](ci-cd.md), consignées en ADR-28 à ADR-33. À valider en séance.

**Q14.1** On ajoute une branche `develop` et un environnement `staging` pour la recette, ou on reste sur `main` seule ?
→ `develop` + `staging`. Coût : environ 1 h 30 en S0 et quelques dollars par mois. La démo du jury reste stable pendant qu'on continue à fusionner.
Réponse :

**Q14.2** Le projet Railway reste dans l'espace de Maxime ? Il y a été créé le 2026-11-25 (essai, puis plan Free, qui n'accepte qu'un membre).
→ Oui : 0 €, Maxime fait les réglages Railway et la démonstration du 503 en ligne ; Mael installe l'application GitHub de Railway sur le dépôt ; toute l'équipe est membre de Neon (ADR-35).
Réponse :

**Q14.3** Quelle est la date exacte de la soutenance ?
→ Nécessaire pour planifier le gel de `main` (J-2), la release `v1.0.0` et la chauffe des services gratuits.
Réponse :

**Q14.4** Qui est référent CI ?
→ Maxime (référent qualité) ; Mael garde Railway et les réglages GitHub (lui seul est admin du dépôt).
Réponse :

**Q14.5** On ajoute une colonne « En recette » au Trello (6 colonnes) ?
→ Oui : une carte n'est finie qu'une fois vérifiée sur `staging` par un autre membre.
Réponse :

**Q14.6** Le dépôt est public : on sort les annexes du dossier (PDF, classeur) de Git ?
→ Oui, `docs/annexes/` ignoré ; seules les données converties en JSON sont versionnées.
Réponse :

**Q14.7** `develop` devient la branche par défaut du dépôt ?
→ Oui : les PR la visent par défaut, ce qui évite d'en ouvrir une vers `main` par erreur.
Réponse :

**Q14.8** La relecture par le référent sécurité (session, client d'auth, admin) est imposée par GitHub (`CODEOWNERS`) ou reste une règle d'équipe ?
→ Règle d'équipe : un blocage technique figerait les PR quand Grégory est absent.
Réponse :

**Q14.9** Qui met en place la GitHub App de release (`pulse-release-bot`) ?
→ Maxime la crée et configure le secret, Mael l'installe sur le dépôt (ci-cd.md → Release). Sans elle, il faut fermer et rouvrir la PR de release à la main pour lancer la CI.
Réponse :

**Q14.10** On garde les noms `production` / `staging`, ou on reprend le vocabulaire du dossier ?
→ HAC-ACC-001 (ACC-SEC-02) n'autorise les mots de passe de démo qu'en développement et en recette, et HAC-API-001 §1 parle d'« environnements de développement et de recette ». Proposition : garder `main` comme branche de la version livrée, mais nommer les environnements `demo` et `recette` pour ne pas présenter au jury une « production » qui accepte des mots de passe publiés.
Réponse :

**Q14.11** L'hébergement gratuit Railway Free + Neon (mise en veille, chauffe avant la démo) convient ?
→ Oui ; si Railway refuse 2 services × 2 environnements en Free, `staging` passe sur Render Free ; dernier recours : auto-hébergement Oracle + Dokploy (ci-cd.md → Plan et coût).
Réponse :
