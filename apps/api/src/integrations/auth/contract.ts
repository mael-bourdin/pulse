/** Schémas du contrat HAC-API-001 v1 (côté client). Les propriétés supplémentaires sont ignorées. */
import { z } from "zod";
import { ACCOUNT_STATUSES, ROLES } from "@pulse/shared";

export const identitySchema = z.object({
  userId: z.string().min(1).max(64),
  email: z.string().email().max(254),
  displayName: z.string().min(1).max(120),
  role: z.enum(ROLES),
  accountStatus: z.enum(ACCOUNT_STATUSES),
});

export const loginResponseSchema = identitySchema.extend({
  accessToken: z.string().min(1).max(512),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int().positive(),
});

export const errorResponseSchema = z.object({ code: z.string(), message: z.string() });

export const CONTRACT_ERROR_CODES = {
  400: "AUTH_BAD_REQUEST",
  401: ["AUTH_INVALID_CREDENTIALS", "AUTH_INVALID_TOKEN"],
  403: "AUTH_ACCOUNT_DISABLED",
  503: "AUTH_SERVICE_UNAVAILABLE",
} as const;
