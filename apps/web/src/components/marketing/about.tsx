import * as React from 'react';
import Image from 'next/image';
import { Gem, Instagram, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/container';
import { SectionTitle } from '@/components/ui/section-title';
import { site, isRealSocialUrl } from '@/lib/site';
import { team } from './data';
import { Reveal } from './reveal';

const FEATURES = [
  { key: 'hygiene', Icon: ShieldCheck },
  { key: 'premium', Icon: Gem },
  { key: 'custom', Icon: Sparkles },
  { key: 'cozy', Icon: Leaf },
] as const;

/** "El salón" — editorial split with overlapping framed portrait + years badge. */
export function About(): React.JSX.Element {
  const t = useTranslations('about');
  const founder = team[0];

  return (
    <section id="sobre-mi" className="relative bg-cream py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="relative">
              {/* Marco desplazado en NEGRO — el acento elegante que pidió la
                  clienta (RONDA 1, pto 9), sobre el retrato de Aurora. */}
              <div
                className="absolute -left-4 -top-4 hidden h-full w-full rounded-[2rem] border border-ink/70 sm:block"
                aria-hidden="true"
              />
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] shadow-card">
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: 'linear-gradient(150deg, hsl(330 30% 22%), hsl(330 20% 10%))' }}
                  aria-hidden="true"
                />
                <Image
                  src="/brand/salon-2.jpg"
                  alt="Estudio Aurora, fundadora de Estudio Aurora"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover object-[58%_24%]"
                />
              </div>
              <div className="absolute -bottom-8 -right-4 hidden w-56 rounded-[1.5rem] border border-gold/30 bg-surface p-6 shadow-card sm:block">
                <p className="font-serif text-3xl font-semibold text-brand-600">
                  Belleza, técnica y cuidado
                </p>
                <p className="mt-1 text-sm text-ink-soft">en cada detalle de tus uñas</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-col gap-8">
              <SectionTitle
                index="01"
                align="left"
                eyebrow={t('eyebrow')}
                title={t('title')}
                subtitle={t('body')}
              />
              <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {FEATURES.map(({ key, Icon }) => (
                  <li key={key} className="flex items-start gap-4 border-t border-gold/25 pt-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream-deep text-brand-600">
                      <Icon className="size-5" />
                    </span>
                    <span className="pt-1.5 text-[0.95rem] font-medium leading-snug text-ink">
                      {t(`features.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* "Manos expertas" — el equipo se integra dentro de Sobre mí. */}
              {founder ? (
                <div className="flex items-center gap-5 rounded-[1.5rem] border border-gold/25 bg-surface p-5 shadow-soft">
                  <span className="relative size-20 shrink-0 overflow-hidden rounded-full border border-gold/40">
                    <span
                      className="absolute inset-0"
                      style={{ backgroundImage: 'linear-gradient(155deg, hsl(330 60% 78%), hsl(340 45% 40%))' }}
                      aria-hidden="true"
                    />
                    {founder.image ? (
                      <Image
                        src={founder.image}
                        alt={founder.name}
                        fill
                        loading="lazy"
                        sizes="80px"
                        className="object-cover object-top"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-serif text-2xl italic text-cream">
                        {founder.initials}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                      {t('founderLabel')}
                    </p>
                    <p className="mt-0.5 font-serif text-xl font-semibold text-ink">{founder.name}</p>
                    <p className="text-sm text-ink-soft">{founder.specialty}</p>
                  </div>
                  {/* Instagram: sólo si hay perfil real. TODO: handle de Aurora. */}
                  {isRealSocialUrl(site.socials.instagram) ? (
                    <a
                      href={site.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Instagram de ${founder.name}`}
                      className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream-deep text-brand-600 transition-colors hover:text-brand-700"
                    >
                      <Instagram className="size-4" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
