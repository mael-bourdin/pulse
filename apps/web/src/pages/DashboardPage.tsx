import { Link } from "react-router-dom";
import { CATEGORY_LABELS } from "@pulse/shared";
import { useAuth } from "../auth/AuthContext";
import { meApi } from "../api/endpoints";
import { Alert, Spinner, useLoad } from "../components/ui";

const MOMENT: Record<string, string> = { MATIN: "matin", MIDI: "midi", SOIR: "soir" };

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading } = useLoad(() => Promise.all([meApi.progress(), meApi.preferences().catch(() => null)]));

  const firstName = user?.displayName.split(" ")[0];
  const [progress, prefs] = data ?? [];
  const streak = progress?.metrics.find((m) => m.metricType === "STREAK_DAYS");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour {firstName}</h1>
          <p>Voici un aperçu de votre espace personnel.</p>
        </div>
      </div>
      {loading && <Spinner />}
      {error && <Alert tone="error">{error}</Alert>}
      {progress && (
        <div className="grid grid-4">
          <article className="card tint-blue kpi">
            <h2 className="label">Objectifs</h2>
            <p className="value">{progress.goals.active} actif{progress.goals.active > 1 ? "s" : ""}</p>
            <Link to="/objectifs">Voir mes objectifs</Link>
          </article>
          <article className="card tint-teal kpi teal">
            <h2 className="label">Défis</h2>
            <p className="value">
              {progress.challenges.active} participation{progress.challenges.active > 1 ? "s" : ""} active
              {progress.challenges.active > 1 ? "s" : ""}
            </p>
            <Link to="/defis">Découvrir les défis</Link>
          </article>
          <article className="card kpi teal">
            <h2 className="label">Progression</h2>
            <p className="value">{streak?.value != null ? `${streak.value} jours de suivi` : "À démarrer"}</p>
            <Link to="/progression">Voir ma progression</Link>
          </article>
          <article className="card kpi navy">
            <h2 className="label">Préférences</h2>
            <p className="value">
              {prefs
                ? `${CATEGORY_LABELS[prefs.themePrioritaire]} • ${
                    prefs.frequenceRappel === "AUCUN" ? "sans rappel" : `rappels ${MOMENT[prefs.momentPrefere]}`
                  }`
                : "À définir"}
            </p>
            <Link to="/preferences">Modifier mes préférences</Link>
          </article>
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <Alert tone="info">
          Votre espace est personnel : vos objectifs, défis et progression ne sont jamais visibles par votre employeur.
        </Alert>
      </div>
    </>
  );
}
