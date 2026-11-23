import { readFileSync } from "node:fs";
import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

export type Role = "USER" | "FUNCTIONAL_ADMIN";
export type AccountStatus = "ACTIVE" | "DISABLED";

interface StoredUser {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  accountStatus: AccountStatus;
  /** Format : scrypt$<sel base64>$<empreinte base64>. Les mots de passe de démo ne sont jamais stockés en clair. */
  passwordHash: string;
}

export type PublicUser = Omit<StoredUser, "passwordHash">;

export class UserRepository {
  private readonly users: StoredUser[];
  /** Empreinte factice : on calcule toujours un scrypt, même si l'e-mail est inconnu (pas d'oracle temporel). */
  private readonly dummyHash = `scrypt$${randomBytes(16).toString("base64")}$${randomBytes(32).toString("base64")}`;

  constructor(file: string) {
    this.users = JSON.parse(readFileSync(file, "utf8")) as StoredUser[];
  }

  findById(userId: string): PublicUser | undefined {
    const u = this.users.find((x) => x.userId === userId);
    return u ? toPublic(u) : undefined;
  }

  /** Retourne l'utilisateur si et seulement si e-mail ET mot de passe sont corrects. */
  verifyCredentials(email: string, password: string): PublicUser | undefined {
    const user = this.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    const ok = verifyPassword(password, user?.passwordHash ?? this.dummyHash);
    return user && ok ? toPublic(user) : undefined;
  }
}

function toPublic({ passwordHash: _omit, ...rest }: StoredUser): PublicUser {
  return rest;
}

function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}
