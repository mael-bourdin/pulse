/**
 * Schémas de validation des entrées (ACC-SEC-03).
 * Utilisés côté API (source de vérité) et côté front (retour immédiat dans les formulaires).
 */
import { z } from "zod";
import {
  CATEGORIES,
  CHALLENGE_STATUSES,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  PREFERRED_MOMENTS,
  REMINDER_FREQUENCIES,
} from "./domain";

const isoDate = z
  .string({ required_error: "La date est obligatoire" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date attendu : AAAA-MM-JJ")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Date invalide");

const text = (label: string, max: number) =>
  z
    .string({ required_error: `${label} est obligatoire` })
    .trim()
    .min(1, `${label} est obligatoire`)
    .max(max, `${label} : ${max} caractères maximum`);

const positiveNumber = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} doit être un nombre` })
    .finite(`${label} doit être un nombre`)
    .positive(`${label} doit être strictement positive`)
    .max(1_000_000, `${label} est trop grande`);

export const loginSchema = z.object({
  email: z.string().trim().min(1, "L’adresse e-mail est obligatoire").max(254),
  password: z.string().min(1, "Le mot de passe est obligatoire").max(200),
});

/** RG-PREF-02..05 – les clés inconnues sont rejetées (strict). */
export const preferencesUpdateSchema = z
  .object({
    themePrioritaire: z.enum(CATEGORIES, { message: "Thème non pris en charge" }),
    notifications: z.boolean({ message: "Valeur attendue : oui/non" }),
    frequenceRappel: z.enum(REMINDER_FREQUENCIES, { message: "Fréquence non prise en charge" }),
    momentPrefere: z.enum(PREFERRED_MOMENTS, { message: "Moment non pris en charge" }),
    participationDefis: z.boolean({ message: "Valeur attendue : oui/non" }),
  })
  .strict();
export type PreferencesUpdate = z.infer<typeof preferencesUpdateSchema>;

/** RG-GOAL-02 */
export const goalCreateSchema = z
  .object({
    label: text("Le libellé", 120),
    category: z.enum(CATEGORIES, { message: "Catégorie non prise en charge" }),
    targetValue: positiveNumber("La valeur cible"),
    unit: text("L’unité", 30),
    endDate: isoDate.nullable().optional(),
  })
  .strict();
export type GoalCreate = z.infer<typeof goalCreateSchema>;

export const goalUpdateSchema = goalCreateSchema.partial().strict();
export type GoalUpdate = z.infer<typeof goalUpdateSchema>;

/** RG-GOAL-08 */
export const progressUpdateSchema = z
  .object({
    currentValue: z.coerce
      .number({ invalid_type_error: "La progression doit être un nombre" })
      .finite()
      .min(0, "La progression ne peut pas être négative")
      .max(1_000_000),
  })
  .strict();

/** RG-ADM-03 */
export const challengeInputSchema = z
  .object({
    title: text("Le titre", 120),
    category: z.enum(CATEGORIES, { message: "Catégorie non prise en charge" }),
    description: text("La description", 1000),
    startDate: isoDate,
    endDate: isoDate,
    targetValue: positiveNumber("La cible"),
    unit: text("L’unité", 30),
    status: z.enum(CHALLENGE_STATUSES, { message: "Statut non pris en charge" }),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.endDate < c.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "La date de fin doit suivre la date de début" });
    }
  });
export type ChallengeInput = z.infer<typeof challengeInputSchema>;

/** RG-ADM-04 */
export const contentInputSchema = z
  .object({
    title: text("Le titre", 160),
    type: z.enum(CONTENT_TYPES, { message: "Type non pris en charge" }),
    category: z.enum(CATEGORIES, { message: "Catégorie non prise en charge" }),
    status: z.enum(CONTENT_STATUSES, { message: "Statut non pris en charge" }),
  })
  .strict();
export type ContentInput = z.infer<typeof contentInputSchema>;

/** Identifiants de ressource : format contrôlé avant toute recherche. */
export const resourceIdSchema = z.string().regex(/^[a-z]{2,5}-[0-9a-z-]{1,40}$/i, "Identifiant invalide");

export function zodIssuesToDetails(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((i) => ({ field: i.path.join(".") || "_", message: i.message }));
}
