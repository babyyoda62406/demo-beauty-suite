import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Quote, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@fgd/ui';
import { Container } from '@/components/ui/container';
import { SectionTitle } from '@/components/ui/section-title';
import { initials } from '@/lib/utils';
import type { PublicTestimonial } from '@/lib/public-content';
import { testimonials } from './data';
import { Reveal } from './reveal';

export interface TestimonialsProps {
  /**
   * Opiniones aprobadas del CMS (API). Si es `null` (API caída) o vacío, se usa
   * el contenido estático de `data.ts` (hoy vacío → estado "próximamente").
   */
  testimonials?: PublicTestimonial[] | null;
}

/**
 * Teaser de opiniones en la HOME (RONDA 1, pto 7): un solo bloque corto con
 * enlace "Ver todas las opiniones" → /opiniones. Las reseñas completas viven en
 * su propia página para no alargar el scroll de la landing.
 */
export function Testimonials({ testimonials: apiTestimonials }: TestimonialsProps = {}): React.JSX.Element {
  const t = useTranslations('testimonials');
  const list =
    Array.isArray(apiTestimonials) && apiTestimonials.length > 0
      ? apiTestimonials.map((x) => ({ id: x.id, name: x.clientName, rating: x.rating, text: x.text }))
      : testimonials;
  const [lead] = list;

  return (
    <section id="opiniones" className="relative overflow-hidden bg-cream py-16 sm:py-24">
      <div
        className="pointer-events-none absolute -right-24 top-24 size-80 rounded-full bg-brand-100/40 blur-3xl"
        aria-hidden="true"
      />
      <Container className="relative">
        <SectionTitle index="05" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <Reveal>
          <div className="mt-10 flex flex-col items-start gap-8 rounded-[1.75rem] border border-gold/25 bg-surface p-8 shadow-soft sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            {lead ? (
              <figure className="max-w-2xl">
                <Quote className="size-8 text-gold/70" aria-hidden="true" />
                <blockquote className="mt-4 font-serif text-[clamp(1.5rem,2.6vw,2rem)] font-light italic leading-snug text-ink">
                  {lead.text}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-gradient font-sans text-xs font-semibold text-white">
                    {initials(lead.name)}
                  </span>
                  <span className="text-sm font-semibold text-ink">{lead.name}</span>
                  <span className="flex items-center gap-0.5 text-brand-500">
                    {Array.from({ length: lead.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-brand-500 text-brand-500" />
                    ))}
                  </span>
                </figcaption>
              </figure>
            ) : (
              <div className="max-w-xl">
                <span className="flex size-11 items-center justify-center rounded-full bg-cream-deep text-brand-600">
                  <Star className="size-5" />
                </span>
                <p className="mt-4 font-serif text-2xl font-light italic text-ink">{t('empty')}</p>
                <p className="mt-2 text-sm text-ink-soft">{t('emptyHint')}</p>
              </div>
            )}

            <Button asChild size="lg" variant="outline" className="shrink-0">
              <Link href="/opiniones">
                {t('viewAll')}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
