import type { NextRequest } from 'next/server';
import { badGateway, forwardableHeaders, relayResponse, upstreamUrl } from '@/lib/bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/refresh — exchanges the refresh cookie for a new access token,
 * propagating the rotated cookies (SPEC §4 refresh rotation).
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const upstream = await fetch(upstreamUrl('/auth/refresh'), {
      method: 'POST',
      headers: forwardableHeaders(request),
      cache: 'no-store',
    });
    return await relayResponse(upstream);
  } catch {
    return badGateway();
  }
}
