import type { ApiError } from "@pulse/shared";

/**
 * Client HTTP unique du front : il ne parle QU'À l'API PULSE (jamais directement au service d'auth).
 * URL configurable via VITE_API_URL (.env).
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
const TOKEN_KEY = "pulse.accessToken";

export const tokenStorage = {
  // sessionStorage : le jeton disparaît à la fermeture de l'onglet. Jamais d'identifiants stockés.
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiError["details"] = [],
  ) {
    super(message);
  }
  fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.details ?? []).map((d) => [d.field, d.message]));
  }
}

type Listener = (err: HttpError) => void;
const sessionListeners = new Set<Listener>();
/** Notifié quand la session devient invalide (401) pour renvoyer vers la connexion. */
export const onSessionLost = (fn: Listener) => {
  sessionListeners.add(fn);
  return () => {
    sessionListeners.delete(fn);
  };
};

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStorage.get();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new HttpError(0, "NETWORK_ERROR", "Impossible de joindre PULSE. Vérifiez votre connexion et réessayez.");
  }

  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as (ApiError & T) | null;

  if (!response.ok) {
    const err = new HttpError(
      response.status,
      body?.code ?? "UNKNOWN_ERROR",
      // On n'affiche que des messages fonctionnels ; jamais de contenu brut inattendu.
      typeof body?.message === "string" ? body.message : "Une erreur inattendue est survenue. Réessayez plus tard.",
      body?.details,
    );
    if (response.status === 401 && path !== "/api/auth/login") sessionListeners.forEach((fn) => fn(err));
    throw err;
  }
  return body as T;
}
