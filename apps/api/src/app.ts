import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import type { AuthClient } from "./integrations/auth/authClient";
import type { Store } from "./store/store";
import { AppError } from "./errors";
import { authenticate, requireRole } from "./http/session";
import { authRoutes } from "./routes/auth";
import { adminRoutes, personalRoutes } from "./routes/me";

export interface AppDeps {
  authClient: AuthClient;
  store: Store;
  corsOrigins: string[];
  authMeCacheSeconds?: number;
}

export function createApp({ authClient, store, corsOrigins, authMeCacheSeconds = 0 }: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, allowedHeaders: ["Content-Type", "Authorization"] }));
  app.use(express.json({ limit: "20kb" }));

  // Journal : méthode, chemin, statut, durée. Jamais de corps, de jeton ni de donnée personnelle.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (process.env.NODE_ENV !== "test")
        console.log(`[api] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start} ms)`);
    });
    next();
  });

  const authenticated = authenticate(authClient, authMeCacheSeconds);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRoutes(authClient, authenticated));
  app.use("/api/me", authenticated, requireRole("USER"), personalRoutes(store));
  app.use("/api/admin", authenticated, requireRole("FUNCTIONAL_ADMIN"), adminRoutes(store));

  app.use((_req, _res, next) => next(new AppError(404, "NOT_FOUND", "Élément introuvable.")));

  // Aucune trace technique vers le client (ACC-GEN-06, ACC-SEC-07).
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) return res.status(err.status).json(err.toJSON());
    if ((err as { type?: string }).type === "entity.parse.failed") {
      return res.status(400).json({ code: "INVALID_JSON", message: "Requête invalide." });
    }
    if ((err as { type?: string }).type === "entity.too.large") {
      return res.status(413).json({ code: "PAYLOAD_TOO_LARGE", message: "Requête trop volumineuse." });
    }
    console.error("[api] unexpected error:", (err as Error)?.name ?? "Error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Une erreur inattendue est survenue. Réessayez plus tard." });
  };
  app.use(onError);

  return app;
}
