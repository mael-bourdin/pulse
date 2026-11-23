import { useState, type FormEvent } from "react";
import { CATEGORIES, CATEGORY_LABELS, UNITS, goalCreateSchema, progressUpdateSchema, type Goal } from "@pulse/shared";
import { meApi } from "../api/endpoints";
import { HttpError } from "../api/client";
import { Alert, EmptyState, Field, ProgressBar, Spinner, StatusBadge, errorMessage, formatNumber, useLoad, useToast } from "../components/ui";

type FormState = { label: string; category: string; targetValue: string; unit: string };
const EMPTY: FormState = { label: "", category: "ACTIVITE", targetValue: "", unit: "min/jour" };

export function GoalsPage() {
  const toast = useToast();
  const { data: goals, error, loading, reload } = useLoad(() => meApi.goals());
  const [editing, setEditing] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast("success", success);
      reload();
    } catch (e) {
      toast("error", errorMessage(e));
    }
  };

  const open = (goal: Goal | null) => {
    setEditing(goal);
    setShowForm(true);
  };

  const current = (goals ?? []).filter((g) => g.status !== "CLOSED");
  const closed = (goals ?? []).filter((g) => g.status === "CLOSED");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mes objectifs</h1>
          <p>Des objectifs simples et mesurables, à votre rythme.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open(null)}>
          + Nouvel objectif
        </button>
      </div>
      {loading && !goals && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}

      {goals && (
        <div className="split">
          <section className="stack" aria-label="Liste de mes objectifs">
            {current.length === 0 && (
              <EmptyState
                title="Aucun objectif actif"
                text="Fixez-vous un premier cap simple, par exemple quelques minutes de marche par jour."
                action={
                  <button className="btn btn-primary" onClick={() => open(null)}>
                    Créer un objectif
                  </button>
                }
              />
            )}
            {current.map((g) => (
              <GoalCard key={g.goalId} goal={g} onEdit={() => open(g)} run={run} />
            ))}
            {closed.length > 0 && (
              <>
                <h2 style={{ marginTop: 12 }}>Objectifs clôturés</h2>
                {closed.map((g) => (
                  <GoalCard key={g.goalId} goal={g} run={run} />
                ))}
              </>
            )}
          </section>

          {showForm ? (
            <GoalForm
              key={editing?.goalId ?? "new"}
              goal={editing}
              onCancel={() => setShowForm(false)}
              onSaved={(msg) => {
                toast("success", msg);
                setShowForm(false);
                reload();
              }}
            />
          ) : (
            <aside className="card tint-teal stack">
              <h2>Créer ou modifier un objectif</h2>
              <p className="muted">Choisissez « Nouvel objectif » ou « Modifier » sur un objectif actif.</p>
            </aside>
          )}
        </div>
      )}
    </>
  );
}

function GoalCard({
  goal,
  onEdit,
  run,
}: {
  goal: Goal;
  onEdit?: () => void;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [progress, setProgress] = useState(String(goal.currentValue));
  const [progressError, setProgressError] = useState<string>();
  const [confirmClose, setConfirmClose] = useState(false);
  const active = goal.status === "ACTIVE";

  const saveProgress = (e: FormEvent) => {
    e.preventDefault();
    const parsed = progressUpdateSchema.safeParse({ currentValue: progress === "" ? undefined : progress });
    if (!parsed.success) return setProgressError(parsed.error.issues[0]?.message ?? "Valeur invalide");
    setProgressError(undefined);
    void run(() => meApi.setGoalProgress(goal.goalId, parsed.data.currentValue), "Progression mise à jour.");
  };

  return (
    <article className="item" aria-labelledby={`g-${goal.goalId}`}>
      <div className="spread">
        <div>
          <h3 id={`g-${goal.goalId}`}>{goal.label}</h3>
          <span className="meta">{CATEGORY_LABELS[goal.category]}</span>
        </div>
        <StatusBadge status={goal.status} />
      </div>
      <div>
        <p className="small muted">
          {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)} {goal.unit}
        </p>
        <ProgressBar value={goal.currentValue} max={goal.targetValue} label={`Progression : ${goal.label}`} tone={goal.status === "ACTIVE" ? undefined : "teal"} />
      </div>

      {active && (
        <form className="row" onSubmit={saveProgress} noValidate>
          <label className="sr-only" htmlFor={`p-${goal.goalId}`}>
            Nouvelle valeur ({goal.unit})
          </label>
          <input
            id={`p-${goal.goalId}`}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            aria-invalid={Boolean(progressError)}
            style={{ width: 120, minHeight: 36, padding: "6px 10px", borderRadius: 8, border: "1px solid #b8c6d1", font: "inherit" }}
          />
          <button className="btn btn-secondary btn-sm" type="submit">
            Mettre à jour
          </button>
          {progressError && <span className="small" style={{ color: "var(--danger)", fontWeight: 600 }}>{progressError}</span>}
        </form>
      )}

      {goal.status !== "CLOSED" && (
        <div className="row">
          {active && onEdit && (
            <button className="btn btn-secondary btn-sm" onClick={onEdit}>
              Modifier
            </button>
          )}
          {active && (
            <button className="btn btn-secondary btn-sm" onClick={() => run(() => meApi.transitionGoal(goal.goalId, "suspend"), "Objectif mis en pause.")}>
              Suspendre
            </button>
          )}
          {goal.status === "SUSPENDED" && (
            <button className="btn btn-secondary btn-sm" onClick={() => run(() => meApi.transitionGoal(goal.goalId, "reactivate"), "Objectif réactivé.")}>
              Réactiver
            </button>
          )}
          {confirmClose ? (
            <span className="row" role="group" aria-label="Confirmer la clôture">
              <span className="small">Clôturer définitivement ?</span>
              <button className="btn btn-danger btn-sm" onClick={() => run(() => meApi.transitionGoal(goal.goalId, "close"), "Objectif clôturé.")}>
                Oui, clôturer
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmClose(false)}>
                Annuler
              </button>
            </span>
          ) : (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmClose(true)}>
              Clôturer
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function GoalForm({ goal, onCancel, onSaved }: { goal: Goal | null; onCancel: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState<FormState>(
    goal ? { label: goal.label, category: goal.category, targetValue: String(goal.targetValue), unit: goal.unit } : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailure(undefined);
    const parsed = goalCreateSchema.safeParse({ ...form, targetValue: form.targetValue === "" ? undefined : form.targetValue });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (goal) await meApi.updateGoal(goal.goalId, parsed.data);
      else await meApi.createGoal(parsed.data);
      onSaved(goal ? "Objectif modifié." : "Objectif créé. Bonne route !");
    } catch (err) {
      if (err instanceof HttpError) setErrors(err.fieldErrors());
      setFailure(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card tint-teal stack" onSubmit={submit} noValidate aria-labelledby="goal-form-title">
      <h2 id="goal-form-title">{goal ? "Modifier l’objectif" : "Créer un objectif"}</h2>
      <p className="small muted">Les champs marqués * sont obligatoires.</p>
      <Field label="Libellé" required error={errors.label}>
        {(p) => <input {...p} value={form.label} onChange={set("label")} maxLength={120} placeholder="Faire 30 minutes d’activité" />}
      </Field>
      <div className="form-grid">
        <Field label="Catégorie" required error={errors.category}>
          {(p) => (
            <select {...p} value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Unité" required error={errors.unit}>
          {(p) => (
            <select {...p} value={form.unit} onChange={set("unit")}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Valeur cible" required error={errors.targetValue} hint="Un nombre strictement positif.">
          {(p) => <input {...p} type="number" min={0} step="any" inputMode="decimal" value={form.targetValue} onChange={set("targetValue")} />}
        </Field>
      </div>
      {failure && <Alert tone="error">{failure}</Alert>}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
