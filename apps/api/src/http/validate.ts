import type { NextFunction, Request, Response, RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";
import { resourceIdSchema, zodIssuesToDetails } from "@pulse/shared";
import { AppError } from "../errors";

/** Validation des entrées avant toute logique métier (ACC-SEC-03). */
export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Certaines informations sont invalides.", zodIssuesToDetails(result.error));
  }
  return result.data;
}

export function idParam(req: Request, name = "id"): string {
  const parsed = resourceIdSchema.safeParse(req.params[name]);
  if (!parsed.success) throw new AppError(404, "NOT_FOUND", "Élément introuvable.");
  return parsed.data;
}

/** Express 4 ne propage pas les rejets de promesse : on les redirige vers le gestionnaire d'erreurs. */
export const handler =
  (fn: (req: Request, res: Response) => unknown | Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve()
      .then(() => fn(req, res))
      .catch(next);
  };
