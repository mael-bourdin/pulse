import type { Goal, GoalCreate, GoalStatus, GoalUpdate } from "@pulse/shared";
import { AppError, conflict, notFound } from "../errors";
import { nextId, today, type Store } from "../store/store";

/** RG-GOAL-01 : un objectif d'un autre utilisateur est traité comme inexistant (pas de fuite d'existence). */
function findOwned(goals: Goal[], userId: string, goalId: string): Goal {
  const goal = goals.find((g) => g.goalId === goalId && g.userId === userId);
  if (!goal) throw notFound("Objectif");
  return goal;
}

export function listGoals(store: Store, userId: string): Goal[] {
  return store.read().goals.filter((g) => g.userId === userId);
}

/** RG-GOAL-02, RG-GOAL-03 */
export function createGoal(store: Store, userId: string, input: GoalCreate): Goal {
  return store.write((data) => {
    const goal: Goal = {
      goalId: nextId("goal", data.goals.map((g) => g.goalId)),
      userId,
      category: input.category,
      label: input.label,
      targetValue: input.targetValue,
      currentValue: 0,
      unit: input.unit,
      status: "ACTIVE",
      startDate: today(),
      endDate: input.endDate ?? null,
    };
    data.goals.push(goal);
    return goal;
  });
}

const requireStatus = (goal: Goal, allowed: GoalStatus[], action: string) => {
  if (!allowed.includes(goal.status)) {
    throw conflict("GOAL_INVALID_STATE", `Impossible de ${action} un objectif dans l’état ${goal.status}.`);
  }
};

/** RG-GOAL-05, RG-GOAL-07 : seul un objectif ACTIVE est modifiable. */
export function updateGoal(store: Store, userId: string, goalId: string, input: GoalUpdate): Goal {
  return store.write((data) => {
    const goal = findOwned(data.goals, userId, goalId);
    requireStatus(goal, ["ACTIVE"], "modifier");
    Object.assign(goal, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
    return goal;
  });
}

/** RG-GOAL-08 */
export function updateGoalProgress(store: Store, userId: string, goalId: string, currentValue: number): Goal {
  if (currentValue < 0) throw new AppError(400, "VALIDATION_ERROR", "La progression ne peut pas être négative.");
  return store.write((data) => {
    const goal = findOwned(data.goals, userId, goalId);
    requireStatus(goal, ["ACTIVE"], "mettre à jour la progression d’");
    goal.currentValue = currentValue;
    return goal;
  });
}

/**
 * Transitions RG-GOAL-05..07 :
 *   ACTIVE    -> SUSPENDED | CLOSED
 *   SUSPENDED -> ACTIVE (réactivation, choix Squad documenté) | CLOSED
 *   CLOSED    -> (terminal)
 */
const TRANSITIONS: Record<"suspend" | "reactivate" | "close", { from: GoalStatus[]; to: GoalStatus; verb: string }> = {
  suspend: { from: ["ACTIVE"], to: "SUSPENDED", verb: "suspendre" },
  reactivate: { from: ["SUSPENDED"], to: "ACTIVE", verb: "réactiver" },
  close: { from: ["ACTIVE", "SUSPENDED"], to: "CLOSED", verb: "clôturer" },
};

export type GoalTransition = keyof typeof TRANSITIONS;

export function transitionGoal(store: Store, userId: string, goalId: string, transition: GoalTransition): Goal {
  const t = TRANSITIONS[transition];
  return store.write((data) => {
    const goal = findOwned(data.goals, userId, goalId);
    requireStatus(goal, t.from, t.verb);
    goal.status = t.to;
    if (t.to === "CLOSED" && !goal.endDate) goal.endDate = today();
    return goal;
  });
}
