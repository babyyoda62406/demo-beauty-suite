import * as React from 'react';
import { Droplets, Flame, MessageCircle, Sparkles, Wind } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@fgd/ui';
import { Container } from '@/components/ui/container';
import { SectionTitle } from '@/components/ui/section-title';
import { formatMoneyCompact, formatServicePrice } from '@/lib/format';
import { whatsappLink } from '@/lib/site';
import type { PublicService } from '@/lib/public-content';
import { services as staticServices } from './data';
import { Reveal } from './reveal';

/**
 * Pasos del ritual. Descritos a partir del material que grabó la clienta
 * (vídeo y fotos del spa, 2026-09-16): baño con pétalos y cítricos, vapor,
 * exfoliante Jelly Spa Therapy y aromaterapia con sales y velas.
 * TODO: que Aurora confirme el orden y si añade algún paso más (masaje, esmaltado).
 */
const STEPS = [
  { key: 'bath', Icon: Droplets },
  { key: 'steam', Icon: Wind },
  { key: 'scrub', Icon: Sparkles },
  { key: 'aroma', Icon: Flame },
] as const;

/** Nombre del servicio en el catálogo; por él se busca el precio vigente del CMS. */
const SERVICE_NAME = 'pedi spa';

const STATIC_PEDI_SPA = staticServices.find((s) => s.id === 'pedi-spa');

/** El Pedi Spa tal y como lo tiene la clienta en su panel, si la API respondió. */
function findPediSpa(services?: PublicService[] | null): PublicService | null {
  if (!Array.isArray(services)) return null;
  return services.find((s) => s.name.trim().toLowerCase() === SERVICE_NAME) ?? null;
}

/**
 * Precio a mostrar: manda el del CMS (céntimos) y, si la API no respondió o el
 * servicio se renombró, cae al contenido estático de `data.ts`. Sin decimales,
 * que es como lo escribe la clienta en su lista de precios ("35 €").
 */
function displayPrice(service: PublicService | null): string {
  if (!service) return STATIC_PEDI_SPA?.price ?? '35 €';
  return service.price > 0
    ? formatMoneyCompact(service.price, service.currency)
    : formatServicePrice(service.price, service.currency);
}

export interface SpaProps {
  /** Servicios del CMS, los mismos que recibe la sección de Servicios. */
  services?: PublicService[] | null;
}

/**
 * "El ritual Pedi Spa" — sección monográfica del servicio estrella de pies.
 *
 * El vídeo vertical que grabó la clienta es el protagonista: va silenciado y en
 * bucle (autoplay solo se permite sin sonido) y lleva sus propios rótulos
 * quemados. Como no todo el mundo verá el vídeo, el mensaje que cuenta —la cita
 * y los pasos del ritual— está también en texto.
 */
export function Spa({ services }: SpaProps = {}): React.JSX.Element {
  const t = useTranslations('spa');
  const service = findPediSpa(services);
  const price = displayPrice(service);

  return (
    <section id="pedi-spa" className="relative overflow-hidden bg-surface py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div className="relative mx-auto w-full max-w-[20rem]">
              {/* Mismo marco desplazado que el retrato de "Sobre mí". */}
              <div
                className="absolute -left-4 -top-4 hidden h-full w-full rounded-[2rem] border border-gold/40 sm:block"
                aria-hidden="true"
              />
              <video
                className="relative aspect-[478/848] w-full rounded-[2rem] object-cover shadow-card"
                poster="/brand/spa/ritual-poster.jpg"
                aria-label={t('videoAlt')}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              >
                <source src="/brand/spa/ritual.mp4" type="video/mp4" />
              </video>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-col gap-8">
              <SectionTitle
                index="03"
                align="left"
                eyebrow={t('eyebrow')}
                title={t('title')}
                subtitle={t('subtitle')}
              />

              <blockquote className="border-l-2 border-gold/50 pl-5 font-serif text-xl italic leading-snug text-brand-600 sm:text-2xl">
                {t('quote')}
              </blockquote>

              <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {STEPS.map(({ key, Icon }) => (
                  <li key={key} className="flex items-start gap-4 border-t border-gold/25 pt-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream-deep text-brand-600">
                      <Icon className="size-5" />
                    </span>
                    <span className="pt-0.5">
                      <span className="block text-[0.95rem] font-semibold leading-snug text-ink">
                        {t(`steps.${key}.title`)}
                      </span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">
                        {t(`steps.${key}.body`)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <p className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    {t('priceLabel')}
                  </span>
                  <span className="font-serif text-3xl font-semibold text-brand-600">{price}</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <a
                      href={whatsappLink(t('whatsappMessage'))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle />
                      {t('book')}
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href="/reservar">{t('bookOnline')}</a>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Detalles del ritual: la bandeja, el exfoliante que usa y el vapor. */}
        <Reveal delay={0.15}>
          <ul className="mt-14 grid gap-5 sm:grid-cols-3">
            <li className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-gold/25 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/gallery/pedi-spa-1.jpg"
                alt={t('photos.tray')}
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
            </li>
            <li className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-gold/25 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/gallery/pedi-spa-2.jpg"
                alt={t('photos.scrub')}
                loading="lazy"
                className="absolute inset-0 size-full object-cover object-top"
              />
            </li>
            <li className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-gold/25 shadow-soft">
              <video
                className="absolute inset-0 size-full object-cover"
                aria-label={t('photos.steam')}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
              >
                <source src="/brand/spa/vapor.mp4" type="video/mp4" />
              </video>
            </li>
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
