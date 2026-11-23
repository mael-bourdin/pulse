import type { ApiError } from "@pulse/shared";

/** Erreur applicative maîtrisée : seuls code + message (+ détails de validation) sortent vers le client. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ApiError["details"],
  ) {
    super(message);
  }

  toJSON(): ApiError {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }
}

export const notFound = (what = "Élément") => new AppError(404, "NOT_FOUND", `${what} introuvable.`);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const forbidden = () =>
  new AppError(403, "FORBIDDEN", "Vous n’avez pas les droits nécessaires pour accéder à cette fonctionnalité.");
