import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { loginSchema } from "@pulse/shared";
import { useAuth } from "../auth/AuthContext";
import { homeFor } from "../auth/RequireRole";
import { HttpError } from "../api/client";
import { Alert, Field } from "../components/ui";

export function LoginPage() {
  const { login, user, notice } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<{ tone: "error" | "warning"; title: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const u = await login(parsed.data.email, parsed.data.password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setPassword("");
      // RG-AUTH-06 : indisponibilité ≠ refus d'identifiants.
      if (err instanceof HttpError && (err.status === 503 || err.status === 0)) {
        setError({ tone: "warning", title: "Service momentanément indisponible", text: err.message });
      } else if (err instanceof HttpError && err.status === 403) {
        setError({ tone: "error", title: "Accès non autorisé", text: err.message });
      } else {
        setError({
          tone: "error",
          title: "Connexion impossible",
          text: err instanceof HttpError ? err.message : "Une erreur inattendue est survenue.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <main className="card login-card" id="contenu">
        <section className="intro">
          <p className="small muted" style={{ fontWeight: 700, letterSpacing: "0.06em", margin: 0 }}>
            HEALTHAI COACH
          </p>
          <h1>Bienvenue dans PULSE</h1>
          <p>Votre espace personnel pour suivre vos objectifs, vos défis et votre progression.</p>
          <div className="confidential">
            <strong>Confidentialité</strong>
            Votre employeur n’accède pas à vos données individuelles.
          </div>
        </section>

        <section aria-labelledby="login-title">
          <h2 id="login-title" style={{ fontSize: "1.5rem", marginBottom: 18 }}>
            Se connecter
          </h2>
          <form className="stack" onSubmit={submit} noValidate>
            {notice && !error && <Alert tone="info">{notice}</Alert>}
            <Field label="Adresse e-mail" required error={fieldErrors.email}>
              {(p) => (
                <input {...p} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <Field label="Mot de passe" required error={fieldErrors.password}>
              {(p) => (
                <input
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Connexion…" : "Se connecter"}
            </button>
            {error && (
              <Alert tone={error.tone} title={error.title}>
                {error.text}
              </Alert>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
