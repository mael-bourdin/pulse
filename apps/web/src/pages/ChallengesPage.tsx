import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CATEGORY_LABELS, type ChallengeView } from "@pulse/shared";
import { meApi } from "../api/endpoints";
import { Alert, EmptyState, ProgressBar, Spinner, StatusBadge, errorMessage, formatDate, formatNumber, useLoad, useToast } from "../components/ui";

const ORDER = { OPEN: 0, UPCOMING: 1, CLOSED: 2 } as const;

export function ChallengesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => meApi.challenges());
  const [busy, setBusy] = useState(false);

  const list = [...(data ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const selected = list.find((c) => c.challengeId === id) ?? list[0];

  const act = async (fn: () => Promise<ChallengeView>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast("success", msg);
      reload();
    } catch (e) {
      toast("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Défis disponibles</h1>
          <p>La participation est toujours volontaire. Vous pouvez quitter un défi à tout moment.</p>
        </div>
      </div>
      {loading && !data && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && data.length === 0 && <EmptyState title="Aucun défi pour le moment" text="De nouveaux défis seront proposés prochainement." />}
      {data && selected && (
        <div className="split">
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Liste des défis">
            {list.map((c) => (
              <li key={c.challengeId}>
                <button
                  className={`item selectable ${c.challengeId === selected.challengeId ? "selected" : ""}`}
                  aria-current={c.challengeId === selected.challengeId ? "true" : undefined}
                  onClick={() => navigate(`/defis/${c.challengeId}`)}
                >
                  <span className="spread" style={{ width: "100%" }}>
                    <span>
                      <strong style={{ display: "block", color: "var(--navy)" }}>{c.title}</strong>
                      <span className="meta">{CATEGORY_LABELS[c.category]}</span>
                    </span>
                    <span className="stack" style={{ alignItems: "flex-end", gap: 6 }}>
                      <StatusBadge status={c.status} context="challenge" />
                      {c.myParticipation?.status === "ACTIVE" && <span className="small" style={{ color: "var(--teal)", fontWeight: 700 }}>Je participe</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <ChallengeDetail
            c={selected}
            busy={busy}
            onJoin={() => act(() => meApi.join(selected.challengeId), "Défi rejoint ! Votre participation est visible dans votre espace.")}
            onLeave={() => act(() => meApi.leave(selected.challengeId), "Vous avez quitté le défi.")}
          />
        </div>
      )}
    </>
  );
}

function ChallengeDetail({ c, busy, onJoin, onLeave }: { c: ChallengeView; busy: boolean; onJoin: () => void; onLeave: () => void }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const p = c.myParticipation;
  const participating = p?.status === "ACTIVE";
  const reason =
    c.status === "UPCOMING"
      ? "Ce défi n’a pas encore commencé : l’inscription ouvrira au démarrage."
      : c.status === "CLOSED"
        ? "Ce défi est terminé : il n’est plus possible de le rejoindre."
        : null;

  return (
    <section className="card tint-teal stack" aria-labelledby="chl-title" aria-live="polite">
      <div className="spread">
        <h2 id="chl-title" style={{ fontSize: "1.4rem" }}>
          {c.title}
        </h2>
        <StatusBadge status={c.status} context="challenge" />
      </div>
      <dl className="facts">
        <dt>Objectif</dt>
        <dd>
          {formatNumber(c.targetValue)} {c.unit}
        </dd>
        <dt>Période</dt>
        <dd>
          du {formatDate(c.startDate)} au {formatDate(c.endDate)}
        </dd>
        <dt>Thème</dt>
        <dd>{CATEGORY_LABELS[c.category]}</dd>
      </dl>
      <p>{c.description}</p>

      {p && (
        <div className="card stack" style={{ padding: 14 }}>
          <div className="spread">
            <strong>Ma participation</strong>
            <StatusBadge status={p.status} />
          </div>
          <p className="small muted">
            {formatNumber(p.progressValue)} / {formatNumber(c.targetValue)} {c.unit} • inscrit le {formatDate(p.joinedAt)}
          </p>
          <ProgressBar value={p.progressValue} max={c.targetValue} label="Ma progression sur ce défi" tone="teal" />
          <p className="small muted">Seule votre progression est affichée : aucun classement entre salariés.</p>
        </div>
      )}

      {reason && <Alert tone="info">{reason}</Alert>}
      {c.canJoin && (
        <button className="btn btn-primary" onClick={onJoin} disabled={busy}>
          {p?.status === "LEFT" ? "Rejoindre à nouveau" : "Rejoindre le défi"}
        </button>
      )}
      {participating &&
        (confirmLeave ? (
          <div className="row" role="group" aria-label="Confirmer la sortie du défi">
            <span>Quitter ce défi ?</span>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { setConfirmLeave(false); onLeave(); }}>
              Oui, quitter
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmLeave(false)}>
              Annuler
            </button>
          </div>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmLeave(true)}>
            Quitter le défi
          </button>
        ))}
    </section>
  );
}
