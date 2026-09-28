import * as React from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@fgd/ui';
import { Container } from '@/components/ui/container';
import { whatsappLink } from '@/lib/site';
import { Reveal } from './reveal';

/**
 * Closing reservation CTA — a bold magenta panel with warm mesh, rose-gold
 * filet and an oversized Cormorant Garamond headline. Anchors the `#reserva` target.
 */
export function CtaReserva(): React.JSX.Element {
  const t = useTranslations('cta');

  return (
    <section id="reserva" className="relative bg-cream py-16 sm:py-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-gold/40 bg-brand-700 px-8 py-14 text-center shadow-card sm:px-16 sm:py-16">
            <div className="pointer-events-none absolute inset-0 bg-warm-mesh opacity-60 mix-blend-screen" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-gold/20 blur-2xl" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-gold-soft" />
                Reserva rápida
              </span>
              <h2 className="mt-7 font-serif text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[1.02] text-white">
                {t('title')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">{t('subtitle')}</p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-brand-700 shadow-soft hover:bg-cream hover:shadow-glow"
                >
                  <a href="/reservar">
                    {t('button')}
                    <ArrowRight />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/50 bg-transparent text-white hover:bg-white/10"
                >
                  <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                    <MessageCircle />
                    {t('whatsapp')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
