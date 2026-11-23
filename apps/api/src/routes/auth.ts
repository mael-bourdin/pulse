import { Router } from "express";
import { loginSchema } from "@pulse/shared";
import type { AuthClient } from "../integrations/auth/authClient";
import { authFailureToError, currentUser } from "../http/session";
import { handler } from "../http/validate";
import { AppError } from "../errors";
import type { RequestHandler } from "express";

export function authRoutes(authClient: AuthClient, authenticated: RequestHandler) {
  const r = Router();

  /** P1 : PULSE relaie la connexion au service d'authentification (HAC-API-001 §10, étapes 1-4). */
  r.post(
    "/login",
    handler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw authFailureToError("BAD_REQUEST", "login");

      const result = await authClient.login(parsed.data.email, parsed.data.password);
      if (!result.ok) throw authFailureToError(result.reason, "login");
      // RG-AUTH-02 : défense en profondeur si un service renvoyait un compte DISABLED en 200.
      if (result.identity.accountStatus !== "ACTIVE") throw authFailureToError("ACCOUNT_DISABLED", "login");

      res.json({ user: result.identity, accessToken: result.accessToken, expiresIn: result.expiresIn });
    }),
  );

  /** REC-05 : vérification de session via GET /api/v1/auth/me (fait par le middleware authenticate). */
  r.get(
    "/session",
    authenticated,
    handler((req, res) => {
      res.json({ user: currentUser(req) });
    }),
  );

  /** Jeton opaque sans révocation côté contrat : la déconnexion est gérée côté client. */
  r.post("/logout", (_req, res) => {
    res.status(204).end();
  });

  r.all("*", () => {
    throw new AppError(404, "NOT_FOUND", "Élément introuvable.");
  });

  return r;
}
