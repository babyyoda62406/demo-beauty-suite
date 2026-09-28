'use client';

import * as React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@fgd/ui';
import { Container } from '@/components/ui/container';
import { SectionTitle } from '@/components/ui/section-title';
import { whatsappLink } from '@/lib/site';
import { mediaUrl } from '@/lib/media';
import { formatServicePrice } from '@/lib/format';
import type { PublicService } from '@/lib/public-content';
import { servicesByCategory, servicesNote, type ServiceItem } from './data';
import { Reveal } from './reveal';

export interface ServicesProps {
  /**
   * Servicios activos que edita la clienta desde el CMS (API). Si es `null`
   * (API caída) o vacío, se usa el contenido estático de `data.ts`.
   */
  services?: PublicService[] | null;
}

/** Tarjeta de servicio estático (data.ts): foto + nombre + descripción + precio. */
function ServiceCard({ service, index }: { service: ServiceItem; index: number }): React.JSX.Element {
  const t = useTranslations('services');
  const [open, setOpen] = React.useState(false);
  const panelId = `service-panel-${service.id}`;

  return (
    <Reveal delay={(index % 3) * 0.06}>
      <li className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-gold/25 bg-surface shadow-soft transition-shadow hover:shadow-card">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'linear-gradient(135deg, hsl(330 80% 74%), hsl(320 60% 44%))' }}
            aria-hidden="true"
          />
          <Image
            src={service.image}
            alt={service.name}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out hover:scale-105"
          />
          <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-3 py-1.5 text-sm font-semibold text-brand-600 shadow-soft backdrop-blur-sm">
            {service.price}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h4 className="font-serif text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {service.name}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.tagline}</p>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="mt-4 inline-flex items-center gap-1.5 self-start text-xs font-semibold uppercase tracking-wider text-brand-600 transition-colors hover:text-brand-700"
          >
            {open ? t('less') : t('more')}
            <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                id={panelId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="pt-3 text-sm leading-relaxed text-ink-soft">{service.description}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Button asChild size="sm" className="mt-5">
            <a
              href={whatsappLink(`Hola, me gustaría reservar: ${service.name} ✨`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle />
              {t('book')}
            </a>
          </Button>
        </div>
      </li>
    </Reveal>
  );
}

/** Tarjeta de servicio proveniente de la API (CMS): precio en céntimos. */
function ApiServiceCard({ service, index }: { service: PublicService; index: number }): React.JSX.Element {
  const t = useTranslations('services');
  const [open, setOpen] = React.useState(false);
  const panelId = `service-panel-${service.id}`;

  return (
    <Reveal delay={(index % 3) * 0.06}>
      <li className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-gold/25 bg-surface shadow-soft transition-shadow hover:shadow-card">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'linear-gradient(135deg, hsl(330 80% 74%), hsl(320 60% 44%))' }}
            aria-hidden="true"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(service.imageUrl)}
            alt={service.name}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out hover:scale-105"
          />
          <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-3 py-1.5 text-sm font-semibold text-brand-600 shadow-soft backdrop-blur-sm">
            {formatServicePrice(service.price, service.currency)}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h4 className="font-serif text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {service.name}
          </h4>
          {service.tagline ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.tagline}</p>
          ) : null}

          {service.description ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={panelId}
                className="mt-4 inline-flex items-center gap-1.5 self-start text-xs font-semibold uppercase tracking-wider text-brand-600 transition-colors hover:text-brand-700"
              >
                {open ? t('less') : t('more')}
                <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pt-3 text-sm leading-relaxed text-ink-soft">{service.description}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>
          ) : null}

          <Button asChild size="sm" className="mt-5">
            <a
              href={whatsappLink(`Hola, me gustaría reservar: ${service.name} ✨`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle />
              {t('book')}
            </a>
          </Button>
        </div>
      </li>
    </Reveal>
  );
}

/**
 * Sección de servicios. Si la clienta ha cargado servicios en el CMS (prop
 * `services` de la API), se muestran esos en una cuadrícula elegante. Si la API
 * falla o no hay servicios, cae al contenido estático de `data.ts`, agrupado
 * por categoría (Uñas · Manicura · Pedicura · Kids).
 */
export function Services({ services }: ServicesProps = {}): React.JSX.Element {
  const t = useTranslations('services');
  const apiServices = Array.isArray(services) && services.length > 0 ? services : null;
  const groups = servicesByCategory();

  return (
    <section id="servicios" className="relative bg-cream-deep py-16 sm:py-24">
      <Container>
        <SectionTitle index="02" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        {apiServices ? (
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apiServices.map((service, index) => (
              <ApiServiceCard key={service.id} service={service} index={index} />
            ))}
          </ul>
        ) : (
          <div className="mt-14 flex flex-col gap-16">
            {groups.map(({ category, items }) => (
              <div key={category.id}>
                <div className="flex items-center gap-4">
                  <h3 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">
                    {category.label}
                  </h3>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-gold/0" aria-hidden="true" />
                </div>

                <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((service, index) => (
                    <ServiceCard key={service.id} service={service} index={index} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <p className="mx-auto mt-14 max-w-3xl text-center text-sm leading-relaxed text-ink-soft/80">
          {servicesNote}
        </p>
      </Container>
    </section>
  );
}
