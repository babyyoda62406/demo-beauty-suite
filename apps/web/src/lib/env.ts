import { z } from 'zod';

/**
 * Public (browser-exposed) environment. Only `NEXT_PUBLIC_*` vars belong here.
 * Server-only secrets must never be read from this module.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so we reference
 * each var explicitly (a dynamic lookup would not be replaced by the compiler).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  // Surface a clear message at startup rather than failing deep in a request.
  throw new Error(
    `Variables de entorno públicas inválidas: ${parsed.error.issues
      .map((i) => `${i.path.join('.')} (${i.message})`)
      .join(', ')}`,
  );
}

export const env = parsed.data;

/** Server-only API base URL. Falls back to the public one when unset. */
export function getApiBaseUrl(): string {
  return process.env.API_INTERNAL_URL ?? env.NEXT_PUBLIC_API_URL;
}
