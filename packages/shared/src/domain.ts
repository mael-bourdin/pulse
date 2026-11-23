/**
 * Référentiels métier de PULSE V1 (HAC-PROD-001 §6).
 * Partagés entre l'API (validation, règles) et le front (libellés, formulaires).
 */

export const ROLES = ["USER", "FUNCTIONAL_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** RG-PREF-02 */
export const CATEGORIES = ["ACTIVITE", "SOMMEIL", "HYDRATATION", "STRESS", "NUTRITION"] as const;
export type Category = (typeof CATEGORIES)[number];

/** RG-PREF-03 */
export const REMINDER_FREQUENCIES = ["QUOTIDIEN", "HEBDOMADAIRE", "AUCUN"] as const;
export type ReminderFrequency = (typeof REMINDER_FREQUENCIES)[number];

/** RG-PREF-04 */
export const PREFERRED_MOMENTS = ["MATIN", "MIDI", "SOIR"] as const;
export type PreferredMoment = (typeof PREFERRED_MOMENTS)[number];

/** RG-GOAL-04 */
export const GOAL_STATUSES = ["ACTIVE", "SUSPENDED", "CLOSED"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** RG-CHAL-01 */
export const CHALLENGE_STATUSES = ["OPEN", "UPCOMING", "CLOSED"] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

/** RG-CHAL-06 */
export const PARTICIPATION_STATUSES = ["ACTIVE", "LEFT", "COMPLETED"] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

/** RG-ADM-04 */
export const CONTENT_TYPES = ["ARTICLE", "FICHE", "CONSEIL"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Unités proposées à la création d'objectif (issues de HAC-DATA-001 03_Objectifs / 04_Defis). */
export const UNITS = [
  "pas/jour",
  "min/jour",
  "min/semaine",
  "h/nuit",
  "L/jour",
  "séances/jour",
  "séances/semaine",
  "jours/semaine",
  "portions/jour",
] as const;

/** Libellés lisibles (pas de ton médical ni culpabilisant – HAC-PROD-001 §8). */
export const CATEGORY_LABELS: Record<Category, string> = {
  ACTIVITE: "Activité",
  SOMMEIL: "Sommeil",
  HYDRATATION: "Hydratation",
  STRESS: "Gestion du stress",
  NUTRITION: "Nutrition",
};

/** Indicateurs de progression connus (HAC-DATA-001 06_Progression). */
export const METRIC_TYPES = [
  "WEEKLY_ACTIVE_DAYS",
  "STREAK_DAYS",
  "WELLBEING_CHECKINS",
  "CHALLENGES_ACTIVE",
  "GOALS_CLOSED",
  "HYDRATION_DAYS",
] as const;
export type MetricType = (typeof METRIC_TYPES)[number];

export const METRIC_LABELS: Record<MetricType, string> = {
  WEEKLY_ACTIVE_DAYS: "Jours avec activité enregistrée",
  STREAK_DAYS: "Série de suivi en cours",
  WELLBEING_CHECKINS: "Check-ins bien-être complétés",
  CHALLENGES_ACTIVE: "Défis collectifs actifs",
  GOALS_CLOSED: "Objectifs clôturés",
  HYDRATION_DAYS: "Jours ayant atteint l’objectif hydratation",
};

/* ---------- Entités exposées par l'API PULSE ---------- */

export interface Identity {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  accountStatus: AccountStatus;
}

export interface Preferences {
  preferenceId: string;
  userId: string;
  themePrioritaire: Category;
  notifications: boolean;
  frequenceRappel: ReminderFrequency;
  momentPrefere: PreferredMoment;
  participationDefis: boolean;
}

export interface Goal {
  goalId: string;
  userId: string;
  category: Category;
  label: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: GoalStatus;
  startDate: string;
  endDate: string | null;
}

export interface Challenge {
  challengeId: string;
  title: string;
  category: Category;
  description: string;
  startDate: string;
  endDate: string;
  targetValue: number;
  unit: string;
  status: ChallengeStatus;
  createdBy: string;
}

export interface Participation {
  participationId: string;
  challengeId: string;
  userId: string;
  joinedAt: string;
  progressValue: number;
  status: ParticipationStatus;
}

export interface Metric {
  metricId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  metricType: string;
  label: string;
  value: number;
  unit: string;
}

export interface Content {
  contentId: string;
  title: string;
  type: ContentType;
  category: Category;
  status: ContentStatus;
  publishedAt: string | null;
  updatedAt: string;
  authorId: string;
}

/** Défi vu par un utilisateur : statut + sa participation éventuelle. */
export interface ChallengeView extends Challenge {
  myParticipation: Participation | null;
  canJoin: boolean;
}

export interface ProgressSummary {
  period: { start: string; end: string } | null;
  metrics: Array<{ metricType: MetricType; label: string; value: number | null; unit: string | null }>;
  goals: { active: number; suspended: number; closed: number; items: Goal[] };
  challenges: { active: number; items: Array<{ challenge: Challenge; participation: Participation }> };
}

/** Structure d'erreur commune (alignée sur HAC-API-001 §6). */
export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}
