import type { NextFunction, Request, Response } from "express";
import type { Identity, Role } from "@pulse/shared";
import type { AuthClient, AuthFailure } from "../integrations/auth/authClient";
import { AppError, forbidden } from "../errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Identité retournée par le service d'authentification (jamais fournie par le client). */
      identity?: Identity;
    }
  }
}

/** Traduction des échecs du service d'auth en messages utilisateur maîtrisés (ACC-AUTH-16, ACC-SEC-07). */
export function authFailureToError(reason: AuthFailure, context: "login" | "session"): AppError {
  switch (reason) {
    case "BAD_REQUEST":
      return new AppError(400, "LOGIN_INVALID_REQUEST", "Veuillez renseigner votre adresse e-mail et votre mot de passe.");
    case "INVALID_CREDENTIALS":
      return new AppError(401, "LOGIN_INVALID_CREDENTIALS", "Adresse e-mail ou mot de passe incorrect.");
    case "INVALID_TOKEN":
      return new AppError(401, "SESSION_INVALID", "Votre session a expiré. Merci de vous reconnecter.");
    case "ACCOUNT_DISABLED":
      return new AppError(
        403,
        "ACCOUNT_DISABLED",
        context === "login"
          ? "Ce compte n’est pas autorisé à accéder à PULSE. Contactez votre référent HealthAI Coach."
          : "Votre compte n’est plus autorisé à accéder à PULSE.",
      );
    case "UNAVAILABLE":
    case "INVALID_RESPONSE":
      // RG-AUTH-06 : une indisponibilité n'est jamais présentée comme un refus d'identifiants.
      return new AppError(
        503,
        "AUTH_UNAVAILABLE",
        "Le service de connexion est momentanément indisponible. Réessayez dans quelques instants.",
      );
  }
}

/**
 * Vérification de session : chaque requête protégée présente le jeton Bearer, PULSE le valide
 * auprès du service via GET /api/v1/auth/me (petit cache mémoire pour limiter les appels).
 * L'identité et le rôle viennent EXCLUSIVEMENT du service d'authentification.
 */
export function authenticate(authClient: AuthClient, cacheSeconds: number) {
  const cache = new Map<string, { identity: Identity; until: number }>();

  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const match = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") ?? "");
      const token = match?.[1];
      if (!token) throw authFailureToError("INVALID_TOKEN", "session");

      const cached = cache.get(token);
      if (cached && cached.until > Date.now()) {
        req.identity = cached.identity;
        return next();
      }

      const result = await authClient.me(token);
      if (!result.ok) {
        cache.delete(token);
        throw authFailureToError(result.reason, "session");
      }
      if (result.identity.accountStatus !== "ACTIVE") throw authFailureToError("ACCOUNT_DISABLED", "session");

      if (cacheSeconds > 0) cache.set(token, { identity: result.identity, until: Date.now() + cacheSeconds * 1000 });
      req.identity = result.identity;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Contrôle d'accès par rôle côté serveur (ACC-AUTH-15, ACC-SEC-04) – indépendant de l'interface. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.identity) return next(authFailureToError("INVALID_TOKEN", "session"));
    if (!roles.includes(req.identity.role)) return next(forbidden());
    next();
  };
}

export const currentUser = (req: Request): Identity => {
  if (!req.identity) throw authFailureToError("INVALID_TOKEN", "session");
  return req.identity;
};
