import type {
  Challenge,
  ChallengeInput,
  ChallengeView,
  Content,
  ContentInput,
  Goal,
  GoalCreate,
  GoalUpdate,
  Identity,
  Participation,
  Preferences,
  PreferencesUpdate,
  ProgressSummary,
} from "@pulse/shared";
import { api } from "./client";

export const authApi = {
  login: (email: string, password: string) =>
    api<{ user: Identity; accessToken: string; expiresIn: number }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  session: () => api<{ user: Identity }>("/api/auth/session"),
  logout: () => api<void>("/api/auth/logout", { method: "POST" }),
};

export const meApi = {
  preferences: () => api<Preferences>("/api/me/preferences"),
  savePreferences: (p: PreferencesUpdate) => api<Preferences>("/api/me/preferences", { method: "PUT", body: p }),

  goals: () => api<Goal[]>("/api/me/goals"),
  createGoal: (g: GoalCreate) => api<Goal>("/api/me/goals", { method: "POST", body: g }),
  updateGoal: (id: string, g: GoalUpdate) => api<Goal>(`/api/me/goals/${encodeURIComponent(id)}`, { method: "PATCH", body: g }),
  setGoalProgress: (id: string, currentValue: number) =>
    api<Goal>(`/api/me/goals/${encodeURIComponent(id)}/progress`, { method: "PUT", body: { currentValue } }),
  transitionGoal: (id: string, t: "suspend" | "reactivate" | "close") =>
    api<Goal>(`/api/me/goals/${encodeURIComponent(id)}/${t}`, { method: "POST" }),

  challenges: () => api<ChallengeView[]>("/api/me/challenges"),
  join: (id: string) => api<ChallengeView>(`/api/me/challenges/${encodeURIComponent(id)}/join`, { method: "POST" }),
  leave: (id: string) => api<ChallengeView>(`/api/me/challenges/${encodeURIComponent(id)}/leave`, { method: "POST" }),
  participations: () => api<Array<{ participation: Participation; challenge: Challenge }>>("/api/me/participations"),

  progress: () => api<ProgressSummary>("/api/me/progress"),
};

export const adminApi = {
  challenges: () => api<Challenge[]>("/api/admin/challenges"),
  createChallenge: (c: ChallengeInput) => api<Challenge>("/api/admin/challenges", { method: "POST", body: c }),
  updateChallenge: (id: string, c: ChallengeInput) =>
    api<Challenge>(`/api/admin/challenges/${encodeURIComponent(id)}`, { method: "PUT", body: c }),
  contents: () => api<Content[]>("/api/admin/contents"),
  createContent: (c: ContentInput) => api<Content>("/api/admin/contents", { method: "POST", body: c }),
  updateContent: (id: string, c: ContentInput) =>
    api<Content>(`/api/admin/contents/${encodeURIComponent(id)}`, { method: "PUT", body: c }),
};
