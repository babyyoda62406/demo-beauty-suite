import type { NextRequest } from 'next/server';
import { badGateway, forwardableHeaders, relayResponse, upstreamUrl } from '@/lib/bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login — forwards credentials to the NestJS API and propagates
 * the httpOnly session + refresh cookies back to the browser.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();
  try {
    const upstream = await fetch(upstreamUrl('/auth/login'), {
      method: 'POST',
      headers: forwardableHeaders(request),
      body,
      cache: 'no-store',
    });
    return await relayResponse(upstream);
  } catch {
    return badGateway();
  }
}
