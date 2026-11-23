# Intégration du service central d'authentification

**Seul endroit du code PULSE qui parle au service d'authentification** (ACC-QUAL-02).

- `authClient.ts` : interface `AuthClient` (ce dont le métier a besoin) + `HttpAuthClient`
  (implémentation HTTP du contrat HAC-API-001).
- `contract.ts` : schémas des réponses du contrat ; toute réponse est validée avant usage (ACC-SEC-05).

Le reste de l'API ne connaît que `AuthClient` et le type `Identity`. Remplacer le simulateur par le
service réel = changer `AUTH_SERVICE_URL`, sans toucher à la logique métier (HAC-API-001 §11).
