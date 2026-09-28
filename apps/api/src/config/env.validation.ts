import { z } from 'zod';

/**
 * Environment schema (SPEC §10). The API refuses to boot if any required
 * variable is missing or malformed — validation runs at startup via
 * `ConfigModule.forRoot({ validate: validateEnv })`.
 *
 * All secrets come from the environment; nothing is hardcoded (SPEC §5).
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    API_PORT: z.coerce.number().int().positive().default(3001),
    WEB_PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET debe tener al menos 16 caracteres'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
    JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),

    COOKIE_DOMAIN: z.string().default('localhost'),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),

    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),

    SMTP_URL: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),

    PLATFORM_DOMAIN: z.string().default('fgdbeauty.app'),
    DEFAULT_TENANT_SLUG: z.string().default('aurora'),

    // Directorio donde se guardan las imágenes subidas (módulo uploads). En prod
    // es un volumen montado; en local, si no es escribible, se cae a ./uploads.
    UPLOAD_DIR: z.string().default('/app/uploads'),

    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  })
  .refine((env) => Boolean(env.SMTP_URL) || Boolean(env.RESEND_API_KEY), {
    message: 'Debe definirse SMTP_URL o RESEND_API_KEY para el envío de correo',
    path: ['SMTP_URL'],
  });

/** Fully-parsed, typed environment (defaults applied). */
export type Env = z.infer<typeof envSchema>;

/**
 * Validation callback consumed by `@nestjs/config`. Throws a descriptive error
 * (aggregating every issue) so a misconfigured environment fails fast and loud.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida → ${details}`);
  }
  return parsed.data;
}
