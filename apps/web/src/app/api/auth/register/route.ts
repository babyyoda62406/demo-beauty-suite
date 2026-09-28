import type { NextRequest } from 'next/server';
import { badGateway, forwardableHeaders, relayResponse, upstreamUrl } from '@/lib/bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register — forwards the sign-up payload to the NestJS API
 * (`POST /api/v1/auth/register`) and propagates the httpOnly session +
 * refresh cookies back to the browser, mirroring `/api/auth/login`.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();
  try {
    const upstream = await fetch(upstreamUrl('/auth/register'), {
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
