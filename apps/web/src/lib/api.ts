import type { ApiError } from '@fgd/types';

/** Error thrown by the typed API client, carrying the uniform API envelope. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly body: ApiError | undefined;

  constructor(status: number, message: string, body?: ApiError) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON body; serialized automatically. Use `rawBody` for FormData/streams. */
  json?: unknown;
  rawBody?: BodyInit;
  /** Query params appended to the URL. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Uso interno: marca un reintento tras refrescar la sesión (anti-bucle). */
  _retried?: boolean;
}

/** El access token vive 15 min; ante un 401 intentamos UN refresco silencioso. */
const REFRESH_ENDPOINT = '/api/auth/refresh';

/**
 * Single-flight del refresco: si varias queries fallan a la vez sólo se dispara
 * un POST /api/auth/refresh y todas esperan a la misma promesa.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(REFRESH_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Liberamos el cerrojo en el siguiente tick para que las llamadas
      // encoladas en este ciclo compartan el mismo resultado.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

/**
 * Browser-side fetch wrapper against the BFF (`/api/*` route handlers).
 * Always sends cookies (httpOnly session) and normalizes errors into
 * `ApiClientError` with the shared `ApiError` envelope.
 *
 * Requests are relative to the same origin so the BFF can attach the session
 * cookie before proxying to the NestJS API.
 */
export async function apiFetch<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { json, rawBody, query, headers, _retried, ...rest } = options;

  const url = new URL(
    path.startsWith('/') ? path : `/${path}`,
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const finalHeaders = new Headers(headers);
  let body: BodyInit | undefined = rawBody;
  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(url.toString(), {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
    ...(body !== undefined ? { body } : {}),
  });

  // Refresco silencioso: si el access token expiró (401), intentamos UNA vez
  // renovar la sesión vía BFF y reejecutamos la petición original. Guardas
  // anti-bucle: no refrescamos las propias rutas /api/auth/* (evita recursión
  // con refresh/login/logout) ni reintentamos más de una vez.
  const isAuthPath = url.pathname.includes('/api/auth/');
  if (response.status === 401 && !_retried && !isAuthPath) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<TResponse>(path, { ...options, _retried: true });
    }
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorBody =
      isJson && payload && typeof payload === 'object'
        ? (payload as ApiError)
        : undefined;
    const rawMessage = errorBody?.message;
    const message =
      rawMessage === undefined
        ? `Error de red (${response.status})`
        : Array.isArray(rawMessage)
          ? rawMessage.join(', ')
          : rawMessage;
    throw new ApiClientError(response.status, message, errorBody);
  }

  // The API wraps every non-paginated success in a `{ data }` envelope
  // (TransformInterceptor). Paginated results keep `{ data, meta }` and are
  // consumed as-is. Unwrap the plain envelope so hooks typed as the entity
  // (arrays/objects) receive the real payload, not the wrapper.
  if (
    payload !== null &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'data' in payload &&
    !('meta' in payload)
  ) {
    return (payload as { data: TResponse }).data;
  }

  return payload as TResponse;
}

/** Convenience helpers bound to common HTTP verbs. */
export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', json }),
  patch: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', json }),
  put: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', json }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
