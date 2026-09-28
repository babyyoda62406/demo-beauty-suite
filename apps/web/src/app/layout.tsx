import type { Metadata, Viewport } from 'next';
import { Allura, Cormorant_Garamond, Poppins } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { env } from '@/lib/env';
import { Providers } from './providers';
import '@/styles/globals.css';

/**
 * Brand typefaces — dirección de la clienta (RONDA 1).
 * - Cormorant Garamond: serif de lujo, alto contraste, para títulos/display
 *   (mapeado a --font-serif). Pesos Light→Bold, con itálica.
 * - Allura: script manuscrita para la firma "Estudio Aurora" y acentos
 *   (mapeada a --font-script, y también al slot display).
 * - Poppins: geométrica limpia para UI, cuerpo, menú y botones (--font-sans).
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const allura = Allura({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'Estudio Aurora — Uñas, manicura y nail art en Ciudad Demo',
    template: '%s · Estudio Aurora',
  },
  description:
    'Uñas acrílicas esculpidas, manicura rusa, pedicura y nail art en Ciudad Demo. Reserva tu cita online o por WhatsApp en Estudio Aurora.',
  keywords: [
    'uñas',
    'uñas acrílicas',
    'manicura rusa',
    'pedicura',
    'nail art',
    'Ciudad Demo',
    'Estudio Aurora',
  ],
  authors: [{ name: 'Estudio Aurora' }],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'Estudio Aurora',
    title: 'Estudio Aurora — Uñas, manicura y nail art en Ciudad Demo',
    description:
      'Uñas acrílicas, manicura rusa, pedicura y nail art. Reserva tu cita online o por WhatsApp.',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/brand/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#D6157F',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const messages = await getMessages();

  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${allura.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-cream font-sans text-ink antialiased">
        <NextIntlClientProvider locale="es" messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
