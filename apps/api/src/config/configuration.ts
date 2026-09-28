import { validateEnv } from './env.validation';

/**
 * Structured, namespaced configuration derived from the validated environment.
 * Consumed via `ConfigService<AppConfig, true>` with `{ infer: true }` so every
 * access stays type-safe. The environment is re-validated here to guarantee the
 * same typed shape regardless of how the loader is invoked.
 */
export function configuration() {
  const env = validateEnv(process.env as Record<string, unknown>);

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    api: {
      port: env.API_PORT,
    },
    web: {
      port: env.WEB_PORT,
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    cookie: {
      domain: env.COOKIE_DOMAIN,
    },
    cors: {
      origins: env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
    mail: {
      smtpUrl: env.SMTP_URL,
      resendApiKey: env.RESEND_API_KEY,
    },
    platform: {
      domain: env.PLATFORM_DOMAIN,
      defaultTenantSlug: env.DEFAULT_TENANT_SLUG,
    },
    uploads: {
      dir: env.UPLOAD_DIR,
    },
    publicUrls: {
      apiUrl: env.NEXT_PUBLIC_API_URL,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    },
  };
}

/** Inferred shape of the application configuration tree. */
export type AppConfig = ReturnType<typeof configuration>;
