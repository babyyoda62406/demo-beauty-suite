import type { NextRequest } from 'next/server';
import { forwardableHeaders, upstreamUrl } from '@/lib/bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TODO(external): `POST /api/v1/auth/forgot-password` no existe todavía en la
// API Nest (ver apps/api/src/auth/auth.controller.ts). Este proxy reenvía la
// petición cuando el endpoint exista; hasta entonces la ruta responderá con
// error y la página de recuperación lo absorbe mostrando siempre un mensaje
// genérico de éxito (no se revela si el correo existe — buena práctica de
// seguridad además de tapar el TODO).
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();
  try {
    const upstream = await fetch(upstreamUrl('/auth/forgot-password'), {
      method: 'POST',
      headers: forwardableHeaders(request),
      body,
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ statusCode: 502, message: 'No disponible' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}
