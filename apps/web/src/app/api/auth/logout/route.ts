import type { NextRequest } from 'next/server';
import { badGateway, forwardableHeaders, relayResponse, upstreamUrl } from '@/lib/bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout — revokes the session upstream and clears cookies via
 * the propagated `Set-Cookie` expiry headers.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const upstream = await fetch(upstreamUrl('/auth/logout'), {
      method: 'POST',
      headers: forwardableHeaders(request),
      cache: 'no-store',
    });
    return await relayResponse(upstream);
  } catch {
    return badGateway();
  }
}
