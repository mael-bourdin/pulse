import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { existsSync } from "node:fs";
import { UserRepository } from "./users";
import { TokenStore } from "./tokens";

export interface SimulatorOptions {
  usersFile: string;
  tokenTtlSeconds: number;
  /** Retourne true si le service doit répondre 503 (mécanisme documenté dans le README). */
  isUnavailable: () => boolean;
}

/** Erreurs du contrat HAC-API-001 §4.4, §5.3 et §6. */
const ERR = {
  BAD_REQUEST: [400, "AUTH_BAD_REQUEST", "Invalid authentication request"],
  INVALID_CREDENTIALS: [401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials"],
  INVALID_TOKEN: [401, "AUTH_INVALID_TOKEN", "Invalid or missing access token"],
  ACCOUNT_DISABLED: [403, "AUTH_ACCOUNT_DISABLED", "Account is disabled"],
  UNAVAILABLE: [503, "AUTH_SERVICE_UNAVAILABLE", "Authentication service temporarily unavailable"],
} as const;

type ErrKey = keyof typeof ERR;
const send = (res: express.Response, key: ErrKey) => {
  const [status, code, message] = ERR[key];
  res.status(status).json({ code, message });
};

export function createSimulator(opts: SimulatorOptions) {
  const users = new UserRepository(opts.usersFile);
  const tokens = new TokenStore(opts.tokenTtlSeconds);
  const app = express();

  app.disable("x-powered-by");
  app.set("etag", false);

  // Journal minimal : méthode, chemin, statut. Jamais le corps (mots de passe) ni l'en-tête Authorization.
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (process.env.NODE_ENV !== "test") console.log(`[auth-sim] ${req.method} ${req.path} -> ${res.statusCode}`);
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: opts.isUnavailable() ? "unavailable" : "ok" });
  });

  const router = express.Router();

  // Simulation d'indisponibilité : s'applique à tous les endpoints du contrat.
  const availability: RequestHandler = (_req, res, next) => (opts.isUnavailable() ? send(res, "UNAVAILABLE") : next());
  router.use(availability);
  router.use(express.json({ limit: "10kb" }));

  // POST /api/v1/auth/login – HAC-API-001 §4
  router.post("/login", (req, res) => {
    const body = req.body as unknown;
    if (typeof body !== "object" || body === null || Array.isArray(body)) return send(res, "BAD_REQUEST");
    const { email, password } = body as Record<string, unknown>;
    if (typeof email !== "string" || typeof password !== "string" || email.trim() === "" || password === "") {
      return send(res, "BAD_REQUEST");
    }

    const user = users.verifyCredentials(email, password);
    // 401 identique que l'adresse existe ou non (§4.4).
    if (!user) return send(res, "INVALID_CREDENTIALS");
    // 403 uniquement si l'adresse ET le mot de passe sont corrects.
    if (user.accountStatus === "DISABLED") return send(res, "ACCOUNT_DISABLED");

    const { accessToken, expiresIn } = tokens.issue(user.userId);
    res.status(200).json({ ...user, accessToken, tokenType: "Bearer", expiresIn });
  });

  // GET /api/v1/auth/me – HAC-API-001 §5
  router.get("/me", (req, res) => {
    const header = req.get("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    const userId = match?.[1] ? tokens.resolve(match[1]) : undefined;
    const user = userId ? users.findById(userId) : undefined;
    if (!user) return send(res, "INVALID_TOKEN");
    if (user.accountStatus === "DISABLED") return send(res, "ACCOUNT_DISABLED");
    res.status(200).json(user);
  });

  app.use("/api/v1/auth", router);

  app.use((_req, res) => {
    res.status(404).json({ code: "NOT_FOUND", message: "Resource not found" });
  });

  // JSON malformé -> 400 du contrat ; toute autre erreur -> message générique, sans trace.
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if ((err as { type?: string }).type === "entity.parse.failed" || (err as { status?: number }).status === 400) {
      return send(res, "BAD_REQUEST");
    }
    console.error("[auth-sim] unexpected error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Unexpected error" });
  };
  app.use(onError);

  return app;
}

export const fileFlag = (file: string) => () =>
  process.env.AUTH_SIM_FORCE_UNAVAILABLE === "true" || existsSync(file);
