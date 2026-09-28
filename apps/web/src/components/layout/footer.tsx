import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Instagram, MapPin, Music2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/container';
import { site, isRealSocialUrl } from '@/lib/site';

/** Marketing footer with brand block, schedule, address and socials. */
export function Footer(): React.JSX.Element {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const year = new Date().getFullYear();
  const hasInstagram = isRealSocialUrl(site.socials.instagram);
  const hasTiktok = isRealSocialUrl(site.socials.tiktok);

  return (
    <footer className="relative overflow-hidden border-t border-gold/30 bg-cream-deep text-ink">
      <div className="pointer-events-none absolute inset-0 bg-warm-mesh opacity-40" aria-hidden="true" />
      <div className="hairline-gold absolute inset-x-0 top-0" aria-hidden="true" />
      <Container className="relative py-20">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            {/* Logo transparente sobre fondo claro (RONDA 1, pto 2). */}
            <Image
              src="/brand/logo.png"
              alt={site.name}
              width={1080}
              height={672}
              sizes="200px"
              className="h-14 w-auto"
            />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">
              {t('poweredBy')}. {site.name} — {nav('book')} y vive una experiencia de
              belleza a tu medida.
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 text-brand-600" />
              <div>
                <p className="font-semibold">{t('schedule')}</p>
                <p className="text-ink-soft">{site.schedule}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 text-brand-600" />
              <div>
                <p className="font-semibold">{t('address')}</p>
                <p className="text-ink-soft">{site.address}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            {/* Redes: sólo se muestran cuando hay un perfil real (no el
                placeholder genérico). TODO: handles reales de Aurora. */}
            {(hasInstagram || hasTiktok) ? (
              <>
                <p className="font-semibold">{t('follow')}</p>
                {/* Instagram reales: salón + academia (chat 2026-08-04). */}
                <div className="flex flex-col gap-2.5">
                  {hasInstagram ? (
                    <a
                      href={site.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2.5 text-ink-soft transition hover:text-brand-600"
                    >
                      <span className="flex size-9 items-center justify-center rounded-full border border-gold/30 bg-surface text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                        <Instagram className="size-4" />
                      </span>
                      <span className="font-medium">{site.socials.instagramHandle}</span>
                    </a>
                  ) : null}
                  <a
                    href={site.socials.instagramAcademia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 text-ink-soft transition hover:text-brand-600"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full border border-gold/30 bg-surface text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                      <Instagram className="size-4" />
                    </span>
                    <span className="font-medium">{site.socials.instagramAcademiaHandle}</span>
                  </a>
                  {hasTiktok ? (
                    <a
                      href={site.socials.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                      className="inline-flex size-9 items-center justify-center rounded-full border border-gold/30 bg-surface text-brand-600 transition hover:bg-brand-500 hover:text-white"
                    >
                      <Music2 className="size-4" />
                    </a>
                  ) : null}
                </div>
              </>
            ) : null}
            <p className="text-ink-soft">{site.email}</p>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-gold/30 pt-6 text-xs text-ink-soft sm:flex-row">
          <p>
            © {year} {site.legalName}. {t('rights')}.
          </p>
          <div className="flex gap-6">
            <Link href="/legal" className="transition hover:text-brand-600">
              {t('legal')}
            </Link>
            <Link href="/privacidad" className="transition hover:text-brand-600">
              {t('privacy')}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
