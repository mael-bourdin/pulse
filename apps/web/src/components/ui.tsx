import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { HttpError } from "../api/client";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  CLOSED: "Clôturé",
  OPEN: "Ouvert",
  UPCOMING: "À venir",
  LEFT: "Quitté",
  COMPLETED: "Terminé",
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
};

export function StatusBadge({ status, context }: { status: string; context?: "challenge" }) {
  const label = context === "challenge" && status === "CLOSED" ? "Terminé" : (STATUS_LABELS[status] ?? status);
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function ProgressBar({ value, max, label, tone }: { value: number; max: number; label: string; tone?: "teal" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div
      className={`progress ${tone ?? ""} ${pct >= 100 ? "done" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Alert({ tone, title, children }: { tone: "info" | "success" | "warning" | "error"; title?: string; children?: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      {label}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; required?: boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy, required })}
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="error" id={`${id}-err`}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Message utilisateur à partir d'une erreur quelconque : jamais de détail technique. */
export const errorMessage = (e: unknown) =>
  e instanceof HttpError ? e.message : "Une erreur inattendue est survenue. Réessayez plus tard.";

/** Chargement de données avec états loading / error / data. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    loader()
      .then((data) => alive && setState({ data, loading: false }))
      .catch((e: unknown) => alive && setState({ error: errorMessage(e), loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);
  return { ...state, reload: () => setTick((t) => t + 1), setData: (data: T) => setState({ data, loading: false }) };
}

/* ---------- Toasts (confirmation visible des actions – HAC-PROD-001 §8) ---------- */
type Toast = { id: number; tone: "success" | "error" | "info"; text: string };
const ToastContext = createContext<(tone: Toast["tone"], text: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-zone" aria-live="polite">
        {toasts.map((t) => (
          <Alert key={t.id} tone={t.tone}>
            {t.text}
          </Alert>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
export const formatShort = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
export const formatNumber = (n: number) => n.toLocaleString("fr-FR");
