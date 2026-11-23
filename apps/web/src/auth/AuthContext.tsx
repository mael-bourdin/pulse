import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Identity } from "@pulse/shared";
import { authApi } from "../api/endpoints";
import { HttpError, onSessionLost, tokenStorage } from "../api/client";

interface AuthState {
  user: Identity | null;
  status: "checking" | "anonymous" | "authenticated";
  /** Message affiché sur l'écran de connexion après une perte de session. */
  notice: string | null;
  login: (email: string, password: string) => Promise<Identity>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Identity | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>(tokenStorage.get() ? "checking" : "anonymous");
  const [notice, setNotice] = useState<string | null>(null);

  const reset = useCallback((message: string | null) => {
    tokenStorage.clear();
    setUser(null);
    setStatus("anonymous");
    setNotice(message);
  }, []);

  // Au chargement : si un jeton existe, PULSE revalide la session via /me (REC-05).
  useEffect(() => {
    if (!tokenStorage.get()) return;
    authApi
      .session()
      .then(({ user }) => {
        setUser(user);
        setStatus("authenticated");
      })
      .catch((e: unknown) => reset(e instanceof HttpError && e.status === 503 ? e.message : null));
  }, [reset]);

  useEffect(() => onSessionLost((err) => reset(err.message)), [reset]);

  const login = useCallback(async (email: string, password: string) => {
    const { user, accessToken } = await authApi.login(email, password);
    tokenStorage.set(accessToken);
    setUser(user);
    setStatus("authenticated");
    setNotice(null);
    return user;
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => undefined);
    reset(null);
  }, [reset]);

  const value = useMemo(() => ({ user, status, notice, login, logout }), [user, status, notice, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hors AuthProvider");
  return ctx;
}
