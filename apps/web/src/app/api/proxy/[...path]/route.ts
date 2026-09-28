import type { NextRequest } from 'next/server';
import { badGateway, forwardableHeaders, relayResponse, upstreamUrl } from '@/lib/bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path: string[] }> };

/**
 * Generic BFF proxy: `/api/proxy/<...>` → NestJS `/api/v1/<...>`.
 * Attaches the incoming session cookie and forwards method, query and body.
 * Used by TanStack Query for authenticated data fetching (SPEC §9).
 */
async function handle(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const target = upstreamUrl(`/${path.map(encodeURIComponent).join('/')}`, request.nextUrl.search);

  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const upstream = await fetch(target, {
      method,
      headers: forwardableHeaders(request),
      ...(hasBody ? { body: await request.arrayBuffer() } : {}),
      cache: 'no-store',
      redirect: 'manual',
    });
    return await relayResponse(upstream);
  } catch {
    return badGateway();
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
