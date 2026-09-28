import * as React from 'react';
import { Clock, ExternalLink, Instagram, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@fgd/ui';
import { Container } from '@/components/ui/container';
import { SectionTitle } from '@/components/ui/section-title';
import { site, whatsappLink, isRealSocialUrl } from '@/lib/site';
import { Reveal } from './reveal';

/**
 * Contacto + ubicación: dirección real, horario, teléfono, Instagram, CTA de
 * WhatsApp y un mapa de Google Maps embebido por dirección (sin API key). El
 * teléfono/IG reales aún no están disponibles (placeholders `// TODO`).
 */
export function Contact(): React.JSX.Element {
  const t = useTranslations('contact');
  // TODO: teléfono real de Aurora. Se reutiliza el número de WhatsApp (placeholder).
  const telHref = `tel:+${site.whatsappNumber}`;

  return (
    <section id="contacto" className="relative bg-cream-deep py-16 sm:py-24">
      <Container>
        <SectionTitle index="06" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-14 grid gap-8 [&>*]:min-w-0 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="flex h-full flex-col gap-6 rounded-[1.5rem] border border-gold/25 bg-surface p-8 shadow-soft">
              <div className="flex items-start gap-4 [&>*:last-child]:min-w-0">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream text-brand-600">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
                    {t('addressLabel')}
                  </p>
                  <p className="mt-1 font-medium text-ink">{site.address}</p>
                  <a
                    href={site.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {t('directions')}
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 border-t border-gold/20 pt-6 [&>*:last-child]:min-w-0">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream text-brand-600">
                  <Clock className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
                    {t('scheduleLabel')}
                  </p>
                  <p className="mt-1 font-medium text-ink">{site.schedule}</p>
                </div>
              </div>

              {/* TODO: teléfono real de Aurora (usa el placeholder de WhatsApp). */}
              <div className="flex items-start gap-4 border-t border-gold/20 pt-6 [&>*:last-child]:min-w-0">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream text-brand-600">
                  <Phone className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
                    {t('phoneLabel')}
                  </p>
                  <a href={telHref} className="mt-1 inline-block font-medium text-ink hover:text-brand-600">
                    {site.phoneDisplay}
                  </a>
                </div>
              </div>

              {/* Instagram REALES: salón + academia (chat 2026-08-04). */}
              {isRealSocialUrl(site.socials.instagram) ? (
                <div className="flex items-start gap-4 border-t border-gold/20 pt-6 [&>*:last-child]:min-w-0">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream text-brand-600">
                    <Instagram className="size-5" />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
                      {t('instagramLabel')}
                    </p>
                    <a
                      href={site.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-wrap items-center gap-x-1 break-all font-medium text-ink hover:text-brand-600"
                    >
                      {site.socials.instagramHandle}
                      <span className="text-xs font-normal text-ink-soft/70">· {t('instagramSalon')}</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                    <a
                      href={site.socials.instagramAcademia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-wrap items-center gap-x-1 break-all font-medium text-ink hover:text-brand-600"
                    >
                      {site.socials.instagramAcademiaHandle}
                      <span className="text-xs font-normal text-ink-soft/70">· {t('instagramAcademia')}</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-4 border-t border-gold/20 pt-6 [&>*:last-child]:min-w-0">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream text-brand-600">
                  <MessageCircle className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
                    {t('bookLabel')}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t('bookText')}</p>
                </div>
              </div>

              <Button asChild size="lg" className="mt-auto">
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                  {t('whatsapp')}
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="h-full min-h-[22rem] w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-gold/30 shadow-card">
              <iframe
                title={t('mapTitle')}
                src={site.mapsEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="size-full min-h-[22rem] max-w-full"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
