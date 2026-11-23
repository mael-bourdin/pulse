import { Router } from "express";
import {
  challengeInputSchema,
  contentInputSchema,
  goalCreateSchema,
  goalUpdateSchema,
  preferencesUpdateSchema,
  progressUpdateSchema,
} from "@pulse/shared";
import type { Store } from "../store/store";
import { currentUser } from "../http/session";
import { handler, idParam, parseBody } from "../http/validate";
import { getPreferences, updatePreferences } from "../domain/preferences";
import { createGoal, listGoals, transitionGoal, updateGoal, updateGoalProgress, type GoalTransition } from "../domain/goals";
import { getChallenge, joinChallenge, leaveChallenge, listChallenges, listMyParticipations } from "../domain/challenges";
import { getProgressSummary } from "../domain/progress";
import {
  adminCreateChallenge,
  adminCreateContent,
  adminListChallenges,
  adminListContents,
  adminUpdateChallenge,
  adminUpdateContent,
} from "../domain/admin";

/**
 * Espace personnel (rôle USER). Le userId vient TOUJOURS de l'identité authentifiée,
 * jamais d'un paramètre client (ACC-PREF-06, ACC-GOAL-03/09, ACC-PROG-03).
 */
export function personalRoutes(store: Store) {
  const r = Router();
  const uid = (req: Parameters<typeof currentUser>[0]) => currentUser(req).userId;

  r.get("/preferences", handler((req, res) => res.json(getPreferences(store, uid(req)))));
  r.put(
    "/preferences",
    handler((req, res) => res.json(updatePreferences(store, uid(req), parseBody(preferencesUpdateSchema, req.body)))),
  );

  r.get("/goals", handler((req, res) => res.json(listGoals(store, uid(req)))));
  r.post(
    "/goals",
    handler((req, res) => res.status(201).json(createGoal(store, uid(req), parseBody(goalCreateSchema, req.body)))),
  );
  r.patch(
    "/goals/:id",
    handler((req, res) => res.json(updateGoal(store, uid(req), idParam(req), parseBody(goalUpdateSchema, req.body)))),
  );
  r.put(
    "/goals/:id/progress",
    handler((req, res) =>
      res.json(updateGoalProgress(store, uid(req), idParam(req), parseBody(progressUpdateSchema, req.body).currentValue)),
    ),
  );
  for (const t of ["suspend", "reactivate", "close"] as GoalTransition[]) {
    r.post(`/goals/:id/${t}`, handler((req, res) => res.json(transitionGoal(store, uid(req), idParam(req), t))));
  }

  r.get("/challenges", handler((req, res) => res.json(listChallenges(store, uid(req)))));
  r.get("/challenges/:id", handler((req, res) => res.json(getChallenge(store, uid(req), idParam(req)))));
  r.post("/challenges/:id/join", handler((req, res) => res.json(joinChallenge(store, uid(req), idParam(req)))));
  r.post("/challenges/:id/leave", handler((req, res) => res.json(leaveChallenge(store, uid(req), idParam(req)))));
  r.get("/participations", handler((req, res) => res.json(listMyParticipations(store, uid(req)))));

  r.get("/progress", handler((req, res) => res.json(getProgressSummary(store, uid(req)))));

  return r;
}

/** Espace d'administration fonctionnelle (rôle FUNCTIONAL_ADMIN). */
export function adminRoutes(store: Store) {
  const r = Router();

  r.get("/challenges", handler((_req, res) => res.json(adminListChallenges(store))));
  r.post(
    "/challenges",
    handler((req, res) =>
      res.status(201).json(adminCreateChallenge(store, currentUser(req).userId, parseBody(challengeInputSchema, req.body))),
    ),
  );
  r.put(
    "/challenges/:id",
    handler((req, res) => res.json(adminUpdateChallenge(store, idParam(req), parseBody(challengeInputSchema, req.body)))),
  );

  r.get("/contents", handler((_req, res) => res.json(adminListContents(store))));
  r.post(
    "/contents",
    handler((req, res) =>
      res.status(201).json(adminCreateContent(store, currentUser(req).userId, parseBody(contentInputSchema, req.body))),
    ),
  );
  r.put(
    "/contents/:id",
    handler((req, res) => res.json(adminUpdateContent(store, idParam(req), parseBody(contentInputSchema, req.body)))),
  );

  return r;
}
