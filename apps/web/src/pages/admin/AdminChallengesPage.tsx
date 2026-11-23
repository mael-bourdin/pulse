import { useState, type FormEvent } from "react";
import { CATEGORIES, CATEGORY_LABELS, CHALLENGE_STATUSES, UNITS, challengeInputSchema, type Challenge } from "@pulse/shared";
import { adminApi } from "../../api/endpoints";
import { HttpError } from "../../api/client";
import { Alert, Field, Spinner, StatusBadge, errorMessage, formatShort, useLoad, useToast } from "../../components/ui";
import { AdminTabs } from "./AdminTabs";

type Form = Record<"title" | "category" | "description" | "startDate" | "endDate" | "targetValue" | "unit" | "status", string>;
const EMPTY: Form = { title: "", category: "ACTIVITE", description: "", startDate: "", endDate: "", targetValue: "", unit: "pas/jour", status: "UPCOMING" };
const STATUS_LABEL = { OPEN: "Ouvert", UPCOMING: "À venir", CLOSED: "Terminé" } as const;

export function AdminChallengesPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => adminApi.challenges());
  const [editing, setEditing] = useState<Challenge | "new" | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Administration PULSE</h1>
          <p>Gestion des défis proposés aux utilisateurs.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + Créer un défi
        </button>
      </div>
      <AdminTabs />
      {editing && (
        <ChallengeForm
          key={editing === "new" ? "new" : editing.challengeId}
          challenge={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(msg) => {
            toast("success", msg);
            setEditing(null);
            reload();
          }}
        />
      )}
      {loading && !data && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <caption className="sr-only">Défis administrables</caption>
            <thead>
              <tr>
                <th scope="col">Titre</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Statut</th>
                <th scope="col">Période</th>
                <th scope="col">Cible</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.challengeId}>
                  <td>
                    <strong>{c.title}</strong>
                  </td>
                  <td>{CATEGORY_LABELS[c.category]}</td>
                  <td>
                    <StatusBadge status={c.status} context="challenge" />
                  </td>
                  <td>
                    {formatShort(c.startDate)} → {formatShort(c.endDate)}
                  </td>
                  <td>
                    {c.targetValue} {c.unit}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(c)} aria-label={`Modifier ${c.title}`}>
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="notice-admin">L’administration fonctionnelle ne donne aucun accès aux objectifs, préférences ou progressions individuelles.</p>
    </>
  );
}

function ChallengeForm({ challenge, onCancel, onSaved }: { challenge: Challenge | null; onCancel: () => void; onSaved: (m: string) => void }) {
  const [form, setForm] = useState<Form>(
    challenge
      ? { ...challenge, targetValue: String(challenge.targetValue) }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailure(undefined);
    const { title, category, description, startDate, endDate, targetValue, unit, status } = form;
    const parsed = challengeInputSchema.safeParse({
      title, category, description, startDate, endDate, unit, status,
      targetValue: targetValue === "" ? undefined : targetValue,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (challenge) await adminApi.updateChallenge(challenge.challengeId, parsed.data);
      else await adminApi.createChallenge(parsed.data);
      onSaved(challenge ? "Défi modifié." : "Défi créé.");
    } catch (err) {
      if (err instanceof HttpError) setErrors(err.fieldErrors());
      setFailure(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card tint-teal stack" onSubmit={submit} noValidate aria-labelledby="chl-form-title">
      <h2 id="chl-form-title">{challenge ? `Modifier « ${challenge.title} »` : "Créer un défi"}</h2>
      <p className="small muted">Tous les champs sont obligatoires.</p>
      <div className="form-grid">
        <div className="full">
          <Field label="Titre" required error={errors.title}>
            {(p) => <input {...p} value={form.title} onChange={set("title")} maxLength={120} />}
          </Field>
        </div>
        <Field label="Catégorie" required error={errors.category}>
          {(p) => (
            <select {...p} value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          )}
        </Field>
        <Field label="Statut" required error={errors.status} hint="Seuls les défis « Ouvert » peuvent être rejoints.">
          {(p) => (
            <select {...p} value={form.status} onChange={set("status")}>
              {CHALLENGE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          )}
        </Field>
        <div className="full">
          <Field label="Description" required error={errors.description}>
            {(p) => <textarea {...p} value={form.description} onChange={set("description")} maxLength={1000} />}
          </Field>
        </div>
        <Field label="Date de début" required error={errors.startDate}>
          {(p) => <input {...p} type="date" value={form.startDate} onChange={set("startDate")} />}
        </Field>
        <Field label="Date de fin" required error={errors.endDate}>
          {(p) => <input {...p} type="date" value={form.endDate} onChange={set("endDate")} />}
        </Field>
        <Field label="Cible" required error={errors.targetValue}>
          {(p) => <input {...p} type="number" min={0} step="any" value={form.targetValue} onChange={set("targetValue")} />}
        </Field>
        <Field label="Unité" required error={errors.unit}>
          {(p) => (
            <select {...p} value={form.unit} onChange={set("unit")}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          )}
        </Field>
      </div>
      {failure && <Alert tone="error">{failure}</Alert>}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
