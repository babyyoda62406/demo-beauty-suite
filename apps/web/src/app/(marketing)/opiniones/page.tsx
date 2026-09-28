import * as React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@fgd/ui';
import { Container } from '@/components/ui/container';
import { Reveal } from '@/components/marketing/reveal';
import { getApprovedTestimonials } from '@/lib/public-content';
import { whatsappLink } from '@/lib/site';
import { initials } from '@/lib/utils';

/** ISR corto: las opiniones aprobadas del CMS se refrescan en ~60 s. */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('opinionesPage');
  return {
    title: t('metaTitle'),
    description: t('subtitle'),
  };
}

/**
 * Página propia de Opiniones (RONDA 1, pto 7): más espacio y estructura para
 * varias reseñas ESCRITAS. Hoy no hay reseñas reales verificadas, así que se
 * muestra un estado honesto "próximamente" + CTA para compartir opinión por
 * WhatsApp. TODO: publicar aquí las opiniones reales (nombre, texto, foto).
 */
export default async function OpinionesPage(): Promise<React.JSX.Element> {
  const t = await getTranslations('opinionesPage');
  // Opiniones reales aprobadas por Aurora en el CMS; si la API falla o no hay
  // ninguna, se muestra el estado honesto "próximamente".
  const reviews = (await getApprovedTestimonials()) ?? [];

  return (
    <>
      {/* Cabecera: foto del estudio de fondo, velada para que el texto se lea. */}
      <section className="relative overflow-hidden bg-ink pb-16 pt-28 text-cream sm:pt-32">
        <Image
          src="/brand/gallery/acrilicas-2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-cover opacity-35"
          aria-hidden="true"
        />
        {/* Doble velo: degradado hacia el negro por abajo + malla cálida. Sin
            esto el titular en crema no tendría contraste suficiente sobre la foto. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/60 to-ink"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-warm-mesh opacity-25" aria-hidden="true" />
        <Container className="relative">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-cream/70 transition hover:text-cream"
          >
            <ArrowLeft className="size-4" />
            {t('back')}
          </Link>
          {/* `block`: el eyebrow es inline-flex y se montaba sobre el enlace de volver. */}
          <span className="eyebrow mt-8 block text-gold-soft">{t('eyebrow')}</span>
          <h1 className="mt-4 max-w-3xl font-serif text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.02]">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream/80 sm:text-lg">
            {t('subtitle')}
          </p>
        </Container>
      </section>

      <section className="relative bg-cream py-16 sm:py-24">
        <Container>
          {reviews.length === 0 ? (
            <Reveal>
              <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-gold/40 bg-surface/70 px-6 py-16 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-cream-deep text-brand-600">
                  <Star className="size-6" />
                </span>
                <p className="font-serif text-2xl font-light italic text-ink">{t('empty')}</p>
                <p className="max-w-md text-sm leading-relaxed text-ink-soft">{t('emptyHint')}</p>
              </div>
            </Reveal>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((item, index) => (
                <Reveal key={item.id} delay={(index % 3) * 0.08}>
                  <li className="flex h-full flex-col rounded-[1.5rem] border border-gold/25 bg-surface p-7 shadow-soft">
                    <div className="flex items-center gap-1 text-brand-500">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} className="size-4 fill-brand-500 text-brand-500" />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-ink-soft">
                      “{item.text}”
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3 border-t border-gold/25 pt-4">
                      <span className="flex size-9 items-center justify-center rounded-full bg-cream-deep font-sans text-xs font-semibold text-brand-700">
                        {initials(item.clientName)}
                      </span>
                      <span className="text-sm font-semibold text-ink">{item.clientName}</span>
                    </figcaption>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}

          {/* CTA: comparte tu opinión por WhatsApp. */}
          <Reveal>
            <div className="mx-auto mt-16 flex max-w-3xl flex-col items-center gap-5 rounded-[2rem] border border-gold/30 bg-cream-deep px-8 py-12 text-center shadow-soft">
              <h2 className="font-serif text-3xl font-semibold text-ink">{t('ctaTitle')}</h2>
              <p className="max-w-xl text-sm leading-relaxed text-ink-soft">{t('ctaText')}</p>
              <Button asChild size="lg">
                <a
                  href={whatsappLink('Hola, me gustaría dejar mi opinión sobre mi experiencia ✨')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle />
                  {t('ctaButton')}
                </a>
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
