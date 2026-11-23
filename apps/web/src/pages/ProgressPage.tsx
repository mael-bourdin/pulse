import { Link } from "react-router-dom";
import { meApi } from "../api/endpoints";
import { Alert, EmptyState, ProgressBar, Spinner, formatNumber, useLoad } from "../components/ui";

const fmtPeriod = (s: string, e: string) => {
  const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  return `Semaine du ${new Date(`${s}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric" })} au ${new Date(`${e}T00:00:00`).toLocaleDateString("fr-FR", o)}`;
};

export function ProgressPage() {
  const { data, error, loading } = useLoad(() => meApi.progress());

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ma progression</h1>
          <p>{data?.period ? fmtPeriod(data.period.start, data.period.end) : "Une synthèse personnelle, simple et sans comparaison."}</p>
        </div>
      </div>
      {loading && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <div className="stack" style={{ gap: 20 }}>
          <section className="grid grid-4" aria-label="Indicateurs de la période">
            {data.metrics.map((m) => (
              <article key={m.metricType} className={`card kpi ${m.value == null ? "" : "teal"}`}>
                <h2 className="label">{m.label}</h2>
                {m.value == null ? (
                  <p className="muted small" style={{ marginTop: 10 }}>
                    Pas encore de donnée pour cet indicateur sur la période.
                  </p>
                ) : (
                  <p className="value">
                    {formatNumber(m.value)} {m.unit}
                  </p>
                )}
              </article>
            ))}
            <article className="card kpi">
              <h2 className="label">Objectifs actifs</h2>
              <p className="value">{data.goals.active}</p>
            </article>
            <article className="card kpi" style={{ borderColor: "#f1cf98" }}>
              <h2 className="label">Défis actifs</h2>
              <p className="value" style={{ color: "var(--warning)" }}>
                {data.challenges.active}
              </p>
            </article>
          </section>

          <div className="grid grid-2">
            <section className="card tint-blue stack" aria-labelledby="pg-goals">
              <h2 id="pg-goals">Objectifs</h2>
              {data.goals.items.length === 0 ? (
                <EmptyState title="Aucun objectif actif" text="Créez un objectif pour suivre votre avancée ici." action={<Link className="btn btn-primary" to="/objectifs">Créer un objectif</Link>} />
              ) : (
                data.goals.items.map((g) => {
                  const pct = Math.round((g.currentValue / g.targetValue) * 100);
                  return (
                    <div key={g.goalId} className="stack" style={{ gap: 6 }}>
                      <div className="spread small">
                        <span>{g.label}</span>
                        <strong style={{ color: "var(--blue)" }}>{Math.min(pct, 100)} %</strong>
                      </div>
                      <ProgressBar value={g.currentValue} max={g.targetValue} label={g.label} />
                    </div>
                  );
                })
              )}
            </section>
            <section className="card tint-teal stack" aria-labelledby="pg-chl">
              <h2 id="pg-chl">Défis</h2>
              {data.challenges.items.length === 0 ? (
                <EmptyState title="Aucune participation en cours" text="Rejoignez un défi ouvert pour le suivre ici." action={<Link className="btn btn-primary" to="/defis">Voir les défis</Link>} />
              ) : (
                data.challenges.items.map(({ challenge, participation }) => (
                  <div key={participation.participationId}>
                    <p className="small muted">{challenge.title}</p>
                    <p style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--teal)" }}>
                      {formatNumber(participation.progressValue)} {challenge.unit}
                    </p>
                  </div>
                ))
              )}
              <p className="small muted">Aucun classement entre salariés.</p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
