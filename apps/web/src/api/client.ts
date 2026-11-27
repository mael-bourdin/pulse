// Seul point d'appel de l'API PULSE (/api/v1). Le front n'appelle jamais le service
// d'auth (ADR-12) : le cookie de session est envoyé par le navigateur, même origine.

/** Champ fautif d'une erreur VALIDATION_ERROR. */
export interface FieldError {
  field: string
  message: string
}

/** Erreur au format commun { code, message, details? } (spec/api/endpoints.md → Erreurs). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: FieldError[]

  constructor(status: number, code: string, message: string, details: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Code utilisé quand le serveur PULSE ne répond pas du tout (réseau coupé). */
export const NETWORK_ERROR = 'NETWORK_ERROR'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Appelle `/api/v1{path}` et renvoie le corps JSON (ou `undefined` pour un 204).
 * L'interface réagit au `code` de l'erreur, jamais au seul statut HTTP (F1-R43).
 */
export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, NETWORK_ERROR, 'Le service PULSE est momentanément injoignable. Réessayez dans quelques instants.')
  }

  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => undefined)
  if (response.ok) {
    // Un 200 dont le corps n'est pas du JSON (page HTML d'un proxy…) n'est pas un succès.
    if (data === undefined) {
      throw new ApiError(response.status, 'INTERNAL_ERROR', 'Une erreur inattendue est survenue.')
    }
    return data as T
  }

  if (isErrorBody(data)) {
    throw new ApiError(response.status, data.code, data.message, data.details ?? [])
  }
  throw new ApiError(response.status, 'INTERNAL_ERROR', 'Une erreur inattendue est survenue.')
}

function isErrorBody(data: unknown): data is { code: string; message: string; details?: FieldError[] } {
  return typeof data === 'object' && data !== null && 'code' in data && 'message' in data
}
