import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "./auth/RequireRole";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { GoalsPage } from "./pages/GoalsPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { ProgressPage } from "./pages/ProgressPage";
import { AdminChallengesPage } from "./pages/admin/AdminChallengesPage";
import { AdminContentsPage } from "./pages/admin/AdminContentsPage";
import { AccessDeniedPage, NotFoundPage } from "./pages/StatusPages";

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/acces-refuse" element={<AccessDeniedPage />} />

      {/* Espace personnel – USER */}
      <Route element={<RequireRole role="USER" />}>
        <Route element={<Layout space="user" />}>
          <Route index element={<DashboardPage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          <Route path="objectifs" element={<GoalsPage />} />
          <Route path="defis" element={<ChallengesPage />} />
          <Route path="defis/:id" element={<ChallengesPage />} />
          <Route path="progression" element={<ProgressPage />} />
        </Route>
      </Route>

      {/* Espace distinct – FUNCTIONAL_ADMIN */}
      <Route path="admin" element={<RequireRole role="FUNCTIONAL_ADMIN" />}>
        <Route element={<Layout space="admin" />}>
          <Route index element={<AdminChallengesPage />} />
          <Route path="contenus" element={<AdminContentsPage />} />
        </Route>
      </Route>

      <Route path="login" element={<Navigate to="/connexion" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
