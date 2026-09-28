import { NextResponse } from 'next/server';
import { getApiBaseUrl } from './env';

/** API version prefix (SPEC §7 — REST rutas versionadas `/api/v1/...`). */
export const API_PREFIX = '/api/v1';

/** Hop-by-hop headers that must not be forwarded when proxying. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'host',
]);

/** Build the absolute upstream URL for a given API path + search string. */
export function upstreamUrl(path: string, search = ''): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${API_PREFIX}${suffix}${search}`;
}

/** Copy request headers that are safe to forward upstream (incl. cookies). */
export function forwardableHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

/**
 * Estados que la especificación de Fetch declara "null body": construir una
 * Response con cuerpo —aunque sea vacío— lanza `TypeError`. La API devuelve 204
 * en todos los borrados, así que sin esta guarda cada DELETE del CMS estallaba
 * en el proxy y la clienta veía un 502 pese a haberse borrado de verdad.
 */
const NULL_BODY_STATUS = new Set([204, 205, 304]);

/**
 * Turn an upstream `fetch` Response into a Next response, propagating status,
 * body and — crucially — any `Set-Cookie` headers (httpOnly session rotation).
 */
export async function relayResponse(upstream: Response): Promise<NextResponse> {
  const isEmpty = NULL_BODY_STATUS.has(upstream.status);
  const body = isEmpty ? null : await upstream.arrayBuffer();
  const response = new NextResponse(body, { status: upstream.status });

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'content-encoding') return;
    if (lower === 'set-cookie') return; // handled explicitly below
    response.headers.set(key, value);
  });

  // `getSetCookie` returns each Set-Cookie header individually (Node 18.14+).
  const setCookies =
    'getSetCookie' in upstream.headers
      ? (upstream.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [];
  for (const cookie of setCookies) {
    response.headers.append('set-cookie', cookie);
  }

  return response;
}

/** Uniform BFF error response when the upstream is unreachable. */
export function badGateway(message = 'No se pudo contactar con el servidor'): NextResponse {
  return NextResponse.json(
    {
      statusCode: 502,
      error: 'Bad Gateway',
      message,
      correlationId: crypto.randomUUID(),
    },
    { status: 502 },
  );
}
