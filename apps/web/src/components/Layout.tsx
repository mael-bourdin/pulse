import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const USER_NAV = [
  { to: "/", label: "Mon espace", end: true },
  { to: "/objectifs", label: "Objectifs" },
  { to: "/defis", label: "Défis" },
  { to: "/progression", label: "Progression" },
  { to: "/preferences", label: "Préférences" },
];
const ADMIN_NAV = [
  { to: "/admin", label: "Défis", end: true },
  { to: "/admin/contenus", label: "Contenus" },
];

export function Layout({ space }: { space: "user" | "admin" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const items = space === "admin" ? ADMIN_NAV : USER_NAV;

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to={space === "admin" ? "/admin" : "/"} className="brand">
            PULSE {space === "admin" && <small>Administration</small>}
          </NavLink>
          <button
            type="button"
            className="btn btn-ghost btn-sm menu-toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
          <nav id="main-nav" className={`nav ${open ? "open" : ""}`} aria-label="Navigation principale" key={location.pathname}>
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} onClick={() => setOpen(false)}>
                {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="userbox">
            <span>
              {user?.displayName}
              {space === "admin" && <span className="role"> • {user?.role}</span>}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
      </header>
      <main id="contenu" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
