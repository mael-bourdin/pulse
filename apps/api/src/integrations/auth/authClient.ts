import type { Identity } from "@pulse/shared";
import { errorResponseSchema, identitySchema, loginResponseSchema } from "./contract";

/**
 * Résultat d'un appel au service d'authentification, sans exception :
 * le code appelant traite explicitement chaque cas du contrat (ACC-SEC-06).
 */
export type AuthFailure =
  | "BAD_REQUEST" // 400
  | "INVALID_CREDENTIALS" // 401 sur /login
  | "INVALID_TOKEN" // 401 sur /me
  | "ACCOUNT_DISABLED" // 403
  | "UNAVAILABLE" // 503, délai dépassé, service injoignable
  | "INVALID_RESPONSE"; // réponse non conforme au contrat

export type LoginResult =
  | { ok: true; identity: Identity; accessToken: string; expiresIn: number }
  | { ok: false; reason: AuthFailure };

export type MeResult = { ok: true; identity: Identity } | { ok: false; reason: AuthFailure };

/** Ce dont PULSE a besoin. Le métier ne dépend que de cette interface. */
export interface AuthClient {
  login(email: string, password: string): Promise<LoginResult>;
  me(accessToken: string): Promise<MeResult>;
}

/** Implémentation HTTP du contrat HAC-API-001 (simulateur local ou service réel). */
export class HttpAuthClient implements AuthClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 3000,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const res = await this.call("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return res;

    if (res.status === 200) {
      const parsed = loginResponseSchema.safeParse(res.body);
      if (!parsed.success) return { ok: false, reason: "INVALID_RESPONSE" };
      const { accessToken, expiresIn, tokenType: _t, ...identity } = parsed.data;
      return { ok: true, identity, accessToken, expiresIn };
    }
    return { ok: false, reason: this.mapError(res.status, res.body, "INVALID_CREDENTIALS") };
  }

  async me(accessToken: string): Promise<MeResult> {
    const res = await this.call("/api/v1/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) return res;

    if (res.status === 200) {
      const parsed = identitySchema.safeParse(res.body);
      return parsed.success ? { ok: true, identity: parsed.data } : { ok: false, reason: "INVALID_RESPONSE" };
    }
    return { ok: false, reason: this.mapError(res.status, res.body, "INVALID_TOKEN") };
  }

  private mapError(status: number, body: unknown, on401: AuthFailure): AuthFailure {
    // Le corps d'erreur doit respecter { code, message } ; sinon la réponse est jugée non conforme.
    if (!errorResponseSchema.safeParse(body).success) return status === 503 ? "UNAVAILABLE" : "INVALID_RESPONSE";
    switch (status) {
      case 400:
        return "BAD_REQUEST";
      case 401:
        return on401;
      case 403:
        return "ACCOUNT_DISABLED";
      case 503:
        return "UNAVAILABLE";
      default:
        return status >= 500 ? "UNAVAILABLE" : "INVALID_RESPONSE";
    }
  }

  private async call(
    path: string,
    init: RequestInit,
  ): Promise<{ ok: true; status: number; body: unknown } | { ok: false; reason: AuthFailure }> {
    try {
      const response = await fetch(new URL(path, this.baseUrl), {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
      const body: unknown = isJson ? await response.json().catch(() => undefined) : undefined;
      if (body === undefined) return { ok: false, reason: response.status >= 500 ? "UNAVAILABLE" : "INVALID_RESPONSE" };
      return { ok: true, status: response.status, body };
    } catch {
      // Réseau coupé, DNS, délai dépassé : indisponibilité, jamais « identifiants refusés » (RG-AUTH-06).
      return { ok: false, reason: "UNAVAILABLE" };
    }
  }
}
