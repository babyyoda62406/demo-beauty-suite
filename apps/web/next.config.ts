import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Basic Content-Security-Policy (SPEC §5/§11). Next.js requires inline styles
 * and, in development, `unsafe-eval` for React Refresh. Keep it permissive
 * enough to run yet closed to third-party origins by default.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https: blob:",
  "connect-src 'self' https:",
  // El mapa de la sección Contacto va en un iframe de Google Maps. Sin declarar
  // `frame-src` se aplicaba `default-src 'self'` y el navegador lo bloqueaba:
  // la web pública mostraba un hueco donde debía estar la dirección del salón.
  // Se limita a Google Maps, no se abre a cualquier origen.
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .join('; ')
  .concat(';');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Salida autocontenida para la imagen Docker (server.js + node_modules mínimos).
  output: 'standalone',
  // En monorepo pnpm, la traza de ficheros debe partir de la raíz del repo.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@fgd/ui', '@fgd/theme', '@fgd/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
