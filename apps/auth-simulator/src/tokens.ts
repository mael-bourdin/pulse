import { randomBytes } from "node:crypto";

/** Jetons opaques en mémoire : aucun renouvellement ni révocation (hors périmètre HAC-API-001 §9). */
export class TokenStore {
  private readonly tokens = new Map<string, { userId: string; expiresAt: number }>();

  constructor(private readonly ttlSeconds: number) {}

  issue(userId: string): { accessToken: string; expiresIn: number } {
    const accessToken = `demo-token-${randomBytes(24).toString("hex")}`;
    this.tokens.set(accessToken, { userId, expiresAt: Date.now() + this.ttlSeconds * 1000 });
    return { accessToken, expiresIn: this.ttlSeconds };
  }

  resolve(token: string): string | undefined {
    const entry = this.tokens.get(token);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return undefined;
    }
    return entry.userId;
  }
}
