import { useEffect, useState, type FormEvent } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PREFERRED_MOMENTS,
  REMINDER_FREQUENCIES,
  preferencesUpdateSchema,
  type PreferencesUpdate,
} from "@pulse/shared";
import { useAuth } from "../auth/AuthContext";
import { meApi } from "../api/endpoints";
import { HttpError } from "../api/client";
import { Alert, Field, Spinner, errorMessage, useLoad, useToast } from "../components/ui";

const FREQ: Record<string, string> = { QUOTIDIEN: "Quotidien", HEBDOMADAIRE: "Hebdomadaire", AUCUN: "Aucun rappel" };
const MOMENT: Record<string, string> = { MATIN: "Matin", MIDI: "Midi", SOIR: "Soir" };

export function PreferencesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, setData } = useLoad(() => meApi.preferences());
  const [form, setForm] = useState<PreferencesUpdate | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const { preferenceId: _p, userId: _u, ...rest } = data;
      setForm(rest);
    }
  }, [data]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const parsed = preferencesUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      setData(await meApi.savePreferences(parsed.data));
      toast("success", "Vos préférences ont été enregistrées.");
    } catch (err) {
      if (err instanceof HttpError) setErrors(err.fieldErrors());
      toast("error", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof PreferencesUpdate>(k: K, v: PreferencesUpdate[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mes préférences</h1>
          <p>Ces paramètres personnalisent votre expérience PULSE.</p>
        </div>
      </div>
      {loading && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && form && (
        <div className="split">
          <aside className="card tint-blue stack" aria-labelledby="profile-title">
            <h2 id="profile-title" style={{ color: "var(--blue)" }}>
              Mon profil
            </h2>
            <p style={{ fontSize: "1.3rem", fontWeight: 800 }}>{user?.displayName}</p>
            <p className="muted small">{user?.email}</p>
            <dl className="facts">
              <dt>Thème prioritaire</dt>
              <dd>{CATEGORY_LABELS[data.themePrioritaire]}</dd>
              <dt>Notifications</dt>
              <dd>{data.notifications ? "activées" : "désactivées"}</dd>
              <dt>Rappel</dt>
              <dd>
                {FREQ[data.frequenceRappel]}
                {data.frequenceRappel !== "AUCUN" && ` • ${MOMENT[data.momentPrefere]}`}
              </dd>
              <dt>Défis</dt>
              <dd>{data.participationDefis ? "je souhaite participer" : "pas pour le moment"}</dd>
            </dl>
          </aside>

          <form className="card stack" onSubmit={submit} noValidate aria-label="Modifier mes préférences">
            <Field label="Thème prioritaire" required error={errors.themePrioritaire}>
              {(p) => (
                <select {...p} value={form.themePrioritaire} onChange={(e) => set("themePrioritaire", e.target.value as never)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Fréquence de rappel" required error={errors.frequenceRappel}>
              {(p) => (
                <select {...p} value={form.frequenceRappel} onChange={(e) => set("frequenceRappel", e.target.value as never)}>
                  {REMINDER_FREQUENCIES.map((c) => (
                    <option key={c} value={c}>
                      {FREQ[c]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Moment préféré" required error={errors.momentPrefere}>
              {(p) => (
                <select {...p} value={form.momentPrefere} onChange={(e) => set("momentPrefere", e.target.value as never)}>
                  {PREFERRED_MOMENTS.map((c) => (
                    <option key={c} value={c}>
                      {MOMENT[c]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <label className="switch">
              Notifications
              <input type="checkbox" role="switch" checked={form.notifications} onChange={(e) => set("notifications", e.target.checked)} />
            </label>
            <label className="switch">
              Participer aux défis collectifs
              <input
                type="checkbox"
                role="switch"
                checked={form.participationDefis}
                onChange={(e) => set("participationDefis", e.target.checked)}
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
