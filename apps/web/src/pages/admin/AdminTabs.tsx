import { NavLink } from "react-router-dom";

export function AdminTabs() {
  return (
    <nav className="tabs" aria-label="Sections d’administration">
      <NavLink to="/admin" end>Défis</NavLink>
      <NavLink to="/admin/contenus">Contenus (secondaire)</NavLink>
    </nav>
  );
}
