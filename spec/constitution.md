# Constitution PULSE V1

Ces règles ne se négocient pas. Une spec ou un code qui les contredit est refusé en revue.

## Imposé par le dossier projet

1. **Web responsive d'abord.** Le parcours F1 à F6 fonctionne dans un navigateur, sur ordinateur, tablette et smartphone (CDC §3, UX p.11). L'app Tauri est un bonus, présenté après F1 à F6 (CDC §6).
2. **Le contrat HAC-API-001 est intouchable.** Le simulateur le respecte à la lettre : chemins, JSON en camelCase, codes 200, 400, 401, 403 et 503. PULSE ne l'appelle que par HTTP, à une URL configurable.
3. **Les droits sont vérifiés par l'API**, sur chaque requête. Masquer un bouton n'est jamais un contrôle d'accès.
4. **L'identité vient uniquement du service d'auth.** Un `userId` envoyé par le client n'est jamais pris en compte.
5. **Confidentialité.** Les objectifs, préférences, participations et progressions ne sont visibles que par leur propriétaire. Ni l'admin ni l'employeur n'y ont accès.
6. **Données synthétiques HAC-DATA-001 uniquement.** Aucun secret dans le dépôt. Aucun mot de passe dans une réponse, un écran ou un journal.
7. **Les erreurs sont maîtrisées.** L'utilisateur voit un message clair en français, jamais de détail technique. Une indisponibilité n'est jamais présentée comme un refus d'identifiants.

## Décidé par l'équipe

8. **On repart de zéro** : Rust pour le serveur, React pour l'interface, Tauri 2 pour le desktop.
9. **Chaque test porte l'identifiant** du critère qu'il vérifie (`ACC-GOAL-04`, `REC-07`).
10. **On n'écrit que ce que la spec demande** : pas de fonctionnalité hors périmètre avant que F1 à F6 soient validées en recette.
11. **Chacun sait expliquer le code qu'il fusionne.** Une PR que son auteur ne sait pas expliquer n'est pas fusionnée.
12. **Simplicité Rust** : un seul style, pas de macros maison, pas d'abstraction sans deuxième usage.
13. **Accessibilité AA garantie, AAA visée** (voir [accessibility.md](accessibility.md)).
14. **Vouvoiement, ton sobre**, jamais médical ni culpabilisant (PROD §8).
