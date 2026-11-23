import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "@pulse/shared";
import { useAuth } from "./AuthContext";
import { Spinner } from "../components/ui";

/**
 * Garde de navigation. Confort d'interface uniquement : le contrôle qui fait foi
 * est réalisé par l'API (requireRole) sur chaque requête (ACC-AUTH-15).
 */
export function RequireRole({ role }: { role: Role }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === "checking") return <Spinner label="Vérification de votre session…" />;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to="/acces-refuse" replace />;
  return <Outlet />;
}

export const homeFor = (role: Role) => (role === "FUNCTIONAL_ADMIN" ? "/admin" : "/");
