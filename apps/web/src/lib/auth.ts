import { cookies } from 'next/headers';
import type { Role } from '@fgd/types';

/**
 * Session cookie names shared between the BFF route handlers and the API.
 * The API issues httpOnly cookies; the BFF forwards them verbatim.
 */
export const SESSION_COOKIE = 'fgd_access_token';
export const REFRESH_COOKIE = 'fgd_refresh_token';

/** Minimal session shape the web app cares about (decoded server-side). */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
}

/**
 * Read the raw access token from the incoming request cookies (server only).
 * Returns `null` when no session cookie is present.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Whether the current request carries a session cookie. */
export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionToken()) !== null;
}

/**
 * Decode the payload segment of a JWT without verifying the signature.
 * Verification happens on the API; here we only need role/tenant for routing.
 * Returns `null` when the token is missing or malformed.
 */
export function decodeSession(token: string | null): SessionUser | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payloadSegment = parts[1];
  if (!payloadSegment) return null;
  try {
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? atob(normalized)
        : Buffer.from(normalized, 'base64').toString('utf-8');
    const claims = JSON.parse(json) as Record<string, unknown>;
    const sub = claims['sub'];
    const email = claims['email'];
    const role = claims['role'];
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof role !== 'string') {
      return null;
    }
    return {
      id: sub,
      email,
      name: typeof claims['name'] === 'string' ? claims['name'] : email,
      role: role as Role,
      tenantId: typeof claims['tenantId'] === 'string' ? claims['tenantId'] : null,
    };
  } catch {
    return null;
  }
}

/** Read and decode the current session user (server components / handlers). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return decodeSession(await getSessionToken());
}
