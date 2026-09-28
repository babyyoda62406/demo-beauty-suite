'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@fgd/ui';
import { cn } from '@/lib/utils';

// Anclas absolutas (`/#...`) para que el nav funcione desde CUALQUIER página
// (p.ej. /reservar), no solo desde la home. Next hace scroll a la sección.
const SECTIONS = [
  { key: 'about', href: '/#sobre-mi' },
  { key: 'services', href: '/#servicios' },
  { key: 'spa', href: '/#pedi-spa' },
  { key: 'gallery', href: '/#galeria' },
  // Opiniones ahora vive en su propia página (RONDA 1, pto 7).
  { key: 'testimonials', href: '/opiniones' },
  { key: 'contact', href: '/#contacto' },
] as const;

/** Marketing header: brand logotype, section nav, auth + booking CTAs. */
export function Header(): React.JSX.Element {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // La cabecera transparente es para el hero claro de la portada. En el resto
  // de páginas arranca con fondo: sobre una cabecera oscura (Opiniones) el menú
  // quedaba en tinta sobre tinta y «Acceder» era ilegible.
  const solida = scrolled || pathname !== '/';

  React.useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        solida
          ? 'border-b border-gold/30 bg-cream/85 shadow-soft backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:h-20 lg:px-8">
        {/* Logo transparente (incluye ya el nombre "Estudio Aurora"): sin
            texto separado al lado. Fuente 1080px vía next/image → nítido en
            retina (RONDA 1, pto 2). */}
        <Link href="/" className="flex items-center" aria-label={t('home')}>
          <Image
            src="/brand/logo.png"
            alt="Estudio Aurora"
            width={1080}
            height={672}
            priority
            sizes="(max-width: 1024px) 132px, 168px"
            className="h-10 w-auto lg:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-brand-600"
            >
              {t(section.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t('login')}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/reservar">{t('book')}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full text-ink lg:hidden"
          aria-label="Menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gold/30 bg-cream/95 backdrop-blur-md lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-5 py-4">
              {SECTIONS.map((section) => (
                <Link
                  key={section.key}
                  href={section.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-ink-soft transition-colors hover:bg-cream-deep hover:text-brand-600"
                >
                  {t(section.key)}
                </Link>
              ))}
              <div className="mt-2 flex gap-3">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    {t('login')}
                  </Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href="/reservar" onClick={() => setOpen(false)}>
                    {t('book')}
                  </Link>
                </Button>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
