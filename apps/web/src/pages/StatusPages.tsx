import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { homeFor } from "../auth/RequireRole";

export function AccessDeniedPage() {
  const { user } = useAuth();
  return (
    <main id="contenu" className="login-page">
      <section className="card stack" style={{ maxWidth: 560, borderColor: "#f1cf98" }}>
        <span className="badge badge-UPCOMING" style={{ alignSelf: "flex-start" }}>Accès refusé</span>
        <h1>Droits insuffisants</h1>
        <p className="muted">
          Cet espace est réservé à un autre profil. Cette restriction est appliquée par le serveur PULSE, pas seulement par l’interface.
        </p>
        <Link className="btn btn-primary" to={user ? homeFor(user.role) : "/connexion"}>Revenir à mon espace</Link>
      </section>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main id="contenu" className="login-page">
      <section className="card stack" style={{ maxWidth: 520 }}>
        <h1>Page introuvable</h1>
        <p className="muted">La page demandée n’existe pas ou a été déplacée.</p>
        <Link className="btn btn-primary" to="/">Revenir à l’accueil</Link>
      </section>
    </main>
  );
}
