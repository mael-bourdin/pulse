import { useState, type FormEvent } from "react";
import { CATEGORIES, CATEGORY_LABELS, CONTENT_STATUSES, CONTENT_TYPES, contentInputSchema, type Content } from "@pulse/shared";
import { adminApi } from "../../api/endpoints";
import { Alert, Field, Spinner, StatusBadge, errorMessage, formatDate, useLoad, useToast } from "../../components/ui";
import { AdminTabs } from "./AdminTabs";

type Form = { title: string; type: string; category: string; status: string };
const TYPE_LABEL = { ARTICLE: "Article", FICHE: "Fiche", CONSEIL: "Conseil" } as const;

export function AdminContentsPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => adminApi.contents());
  const [editing, setEditing] = useState<Content | "new" | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Administration PULSE</h1>
          <p>Contenus d’accompagnement (articles, fiches, conseils).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>+ Créer un contenu</button>
      </div>
      <AdminTabs />
      {editing && (
        <ContentForm
          key={editing === "new" ? "new" : editing.contentId}
          content={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(m) => { toast("success", m); setEditing(null); reload(); }}
        />
      )}
      {loading && !data && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <caption className="sr-only">Contenus administrables</caption>
            <thead>
              <tr>
                <th scope="col">Titre</th><th scope="col">Type</th><th scope="col">Thème</th>
                <th scope="col">Statut</th><th scope="col">Publié le</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.contentId}>
                  <td><strong>{c.title}</strong></td>
                  <td>{TYPE_LABEL[c.type]}</td>
                  <td>{CATEGORY_LABELS[c.category]}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.publishedAt ? formatDate(c.publishedAt) : "—"}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => setEditing(c)} aria-label={`Modifier ${c.title}`}>Modifier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ContentForm({ content, onCancel, onSaved }: { content: Content | null; onCancel: () => void; onSaved: (m: string) => void }) {
  const [form, setForm] = useState<Form>(
    content ? { title: content.title, type: content.type, category: content.category, status: content.status } : { title: "", type: "ARTICLE", category: "ACTIVITE", status: "DRAFT" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = contentInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    try {
      if (content) await adminApi.updateContent(content.contentId, parsed.data);
      else await adminApi.createContent(parsed.data);
      onSaved(content ? "Contenu modifié." : "Contenu créé.");
    } catch (err) {
      setFailure(errorMessage(err));
    }
  };

  return (
    <form className="card tint-teal stack" onSubmit={submit} noValidate aria-labelledby="cnt-form-title">
      <h2 id="cnt-form-title">{content ? "Modifier le contenu" : "Créer un contenu"}</h2>
      <div className="form-grid">
        <div className="full">
          <Field label="Titre" required error={errors.title}>{(p) => <input {...p} value={form.title} onChange={set("title")} maxLength={160} />}</Field>
        </div>
        <Field label="Type" required error={errors.type}>
          {(p) => <select {...p} value={form.type} onChange={set("type")}>{CONTENT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>}
        </Field>
        <Field label="Thème" required error={errors.category}>
          {(p) => <select {...p} value={form.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select>}
        </Field>
        <Field label="Statut" required error={errors.status} hint="Un brouillon n’est pas visible des utilisateurs.">
          {(p) => <select {...p} value={form.status} onChange={set("status")}>{CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s === "DRAFT" ? "Brouillon" : "Publié"}</option>)}</select>}
        </Field>
      </div>
      {failure && <Alert tone="error">{failure}</Alert>}
      <div className="row">
        <button className="btn btn-primary" type="submit">Enregistrer</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
