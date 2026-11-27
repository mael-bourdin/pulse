# Décisions d'architecture (ADR)

Format : décision, raison, alternative écartée. Toute nouvelle décision s'ajoute ici avec la date.

| # | Décision | Raison | Écarté |
|---|---|---|---|
| ADR-01 | **Rust** (serveur et simulateur), on repart de zéro | Langage compilé, performant, envie de l'apprendre. PULSE est un composant indépendant branché par contrats HTTP, donc le Java du SI n'impose rien (TECH §4.2) | Garder le TypeScript existant |
| ADR-02 | **Tauri 2** pour le desktop, sous forme de fenêtre qui charge l'URL de PULSE | Framework cross-platform Rust. Même origine que le web, donc la même session ; aucune logique dupliquée | Commandes Rust dans Tauri (pas de version web, droits côté client) ; interface embarquée (le cookie n'est pas envoyé depuis `tauri://localhost`) |
| ADR-03 | **Monolithe modulaire** + simulateur séparé | Simple à démontrer ; les microservices sont hors périmètre (CDC §6) | Un service par domaine |
| ADR-04 | `pulse-domain` **pur**, sans base ni HTTP | Règles testables sans infrastructure, faciles à expliquer | Logique dans les routes |
| ADR-05 | **Axum 0.8** | Le plus documenté de l'écosystème Tokio ; les extracteurs portent bien les contrôles d'accès | Actix Web, Rocket |
| ADR-06 | **React 19 + Vite + TypeScript** | L'équipe est à l'aise ; rapide | Leptos (personne ne le connaît, plus de 25 h) |
| ADR-07 | **REST `/api/v1`**, OpenAPI **généré** (utoipa) pour PULSE, **écrit à la main** pour l'auth | Une seule source de vérité par contrat ; le contrat d'auth est imposé de l'extérieur | OpenAPI de PULSE écrit à la main (double maintenance) |
| ADR-08 | Erreurs `{ code, message, details? }` | Même format que HAC-API-001 | RFC 9457 |
| ADR-09 | **404** pour la ressource d'un autre utilisateur, **403** pour un rôle insuffisant | Ne révèle pas l'existence d'une ressource ; refus visible pour l'admin (UX p.11) | 403 partout |
| ADR-10 | Session : **cookie httpOnly** qui contient le jeton opaque, `SameSite=Strict`, `Secure` en ligne ; `/me` appelé à **chaque** requête | Jeton invisible pour JavaScript ; REC-04 et REC-05 démontrables en direct ; aucune table de sessions | `sessionStorage` (XSS) ; cache de `/me` (session encore valide après `auth:down`) |
| ADR-11 | CSRF : `SameSite=Strict` + vérification de `Origin` + `Content-Type: application/json` obligatoire sur les écritures | Suffisant pour une API de même origine | Jeton CSRF |
| ADR-12 | Le front n'appelle **jamais** le simulateur ; seule l'API PULSE le fait | Un seul point de couplage (ACC-QUAL-02) | Appel direct depuis le front |
| ADR-13 | **PostgreSQL 16**, `sqlx` avec requêtes vérifiées à l'exécution + migrations | Base relationnelle réelle, déjà prévue par la trajectoire PULSE ; compile sans base disponible | Macros `query!` (base requise à la compilation) ; JSON ; SQLite |
| ADR-14 | Simulateur : utilisateurs dans un fichier JSON avec hachés **Argon2id**, jetons en mémoire (TTL 3600 s) | Fidèle au contrat, pas d'IAM (CDC §6) | Base de données pour le simulateur |
| ADR-15 | 503 : variable `AUTH_SIM_UNAVAILABLE` au démarrage **et** route de pilotage `POST /__control/availability` protégée par `AUTH_SIM_CONTROL_TOKEN`, hors de `/api/v1/auth` | Reproductible en local et en ligne, sans toucher au contrat | Fichier drapeau (inutilisable sur Railway) |
| ADR-16 | Limite de connexion **par IP** : 5 essais par minute | Ne révèle pas l'existence d'un compte (ACC-AUTH-05) | Limite par e-mail |
| ADR-17 | Hébergement **Railway** : 3 services (API publique, simulateur sur réseau privé, PostgreSQL). Plan Free, Hobby le mois de la soutenance. *Précisée le 2026-11-27 par ADR-30 (déploiement après la CI) et ADR-35 (base sur Neon).* | Peu d'administration ; le simulateur n'est pas exposé sur Internet | VPS (administration), Render (mise en veille, base expirée), Netlify (pas de serveur Rust) |
| ADR-18 | Pas de Docker, pas de CI obligatoire ; vérifications via `make check` avant chaque push | Choix de l'équipe ; build Railpack sans Dockerfile | GitHub Actions (bloqué par la facturation) |
| ADR-19 | Le statut d'un défi est **saisi** par l'admin ; aucun statut n'est calculé à partir de la date du jour | Les données datent de février 2026 | Statut calculé |
| ADR-20 | Rejoindre un défi après l'avoir quitté **crée une nouvelle participation** | Historique conservé (PROD §6.4) | Réactiver l'ancienne |
| ADR-21 | Un objectif SUSPENDED peut être réactivé ; CLOSED est définitif | RG-GOAL-06 l'autorise | Pas de réactivation |
| ADR-22 | La progression d'un défi est **en lecture seule** | ACC-CHAL-08 demande seulement de la consulter | Saisie par l'utilisateur |
| ADR-23 | L'admin ne voit **rien** des participants, ni noms ni nombres | RG-ADM-06, confidentialité | Compteurs agrégés |
| ADR-24 | Contenus (SHOULD) faits **après** la validation F1–F6 | CDC §3.6, PROD §7 | Les faire en parallèle |
| ADR-25 | Usage de l'IA **déclaré simplement** dans L5 | CDC §9 | Ne pas le déclarer |
| ADR-26 | Les commits ne portent **aucune** ligne de co-auteur IA ; hook `commit-msg` | Choix de l'équipe ; l'historique reflète les auteurs réels | — |
| ADR-27 | FUNCTIONAL_ADMIN n'a **pas** accès à l'espace personnel (`/me/*` → 403), USER n'a pas accès à `/admin/*` | Espaces distincts (RG-AUTH-04/05, parcours UX : admin = P1 → P6) | Admin avec un espace personnel |
| ADR-30 | (2026-11-27) Railway déploie lui-même `main` sur l'environnement `production` depuis GitHub, **après** la CI verte (« Wait for CI ») ; la CI ne déploie jamais. `production` est la version livrée, environnement de recette au sens d'ACC-SEC-02 ([hosting.md](hosting.md)) | Aucun pipeline de déploiement à écrire ni de jeton Railway dans GitHub : on reste hors de « la construction d'un pipeline CI/CD de mise en production » (TECH §5, CDC §6) | `railway up` lancé par Actions (jeton à protéger, pipeline à maintenir) ; déploiement à chaque push sans attendre la CI |
| ADR-31 | (2026-11-27) Migrations lancées par la commande de pré-déploiement Railway (`pulse-api migrate`) ; une migration fusionnée n'est **jamais** modifiée ; additives seulement une fois la démo en ligne | Une migration en échec annule le déploiement et l'ancienne version reste en ligne ; sqlx refuse une migration appliquée dont le contenu a changé | Migrations au démarrage de l'API (le schéma et le démarrage se mélangent) |
| ADR-32 | (2026-11-27) Aucune sauvegarde de base : restaurer = `make seed-remote` | Données 100 % synthétiques et rechargeables (CDC §4.5) | Sauvegardes gérées |
| ADR-35 | (2026-11-27) PostgreSQL 16 sur **Neon Free**, les deux services Rust sur Railway Free pendant le développement ; Hobby le mois de la soutenance reste possible (ADR-17, Q14.9) | Neon est gratuit sans limite de durée ni carte et accepte toute l'équipe (Railway Free : un seul membre), donc tout le monde peut lancer un seed ; la base ne consomme pas le crédit Railway | Base Railway (un seul membre, consomme le crédit) ; Supabase (pause après 7 jours) ; Render (base supprimée après 30 jours) |
