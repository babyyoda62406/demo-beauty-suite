'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/container';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { mediaUrl, isPlaceholderUrl } from '@/lib/media';
import type { PublicGalleryItem } from '@/lib/public-content';
import { galleryItems, type GalleryCategory } from './data';

type Filter = 'all' | GalleryCategory;

const FILTERS: Filter[] = [
  'all',
  'acrilicas',
  'natural',
  'manicura',
  'pedicura',
  'spa',
  'disenos',
  'antesDespues',
];

/** Hue de respaldo por categoría para el degradado bajo la imagen. */
const CATEGORY_HUE: Record<string, number> = {
  acrilicas: 330,
  natural: 320,
  manicura: 300,
  pedicura: 345,
  spa: 355,
  disenos: 315,
  antesDespues: 335,
};

/** Forma normalizada que renderiza el carrusel (API o estático). */
interface DisplayItem {
  id: string;
  category: string | null;
  caption: string;
  alt: string;
  src: string;
  hue: number;
}

export interface GalleryProps {
  /**
   * Fotos de la galería que edita la clienta desde el CMS (API). Si es `null`
   * (API caída) o vacío, se usa el contenido estático de `data.ts`.
   */
  items?: PublicGalleryItem[] | null;
}

/** Normaliza las fotos de la API a {@link DisplayItem}, filtrando placeholders. */
function fromApi(items: PublicGalleryItem[]): DisplayItem[] {
  return items
    .filter((it) => !isPlaceholderUrl(it.url))
    .map((it) => ({
      id: it.id,
      category: it.category,
      caption: it.caption ?? '',
      alt: it.caption ?? 'Trabajo de Estudio Aurora',
      src: mediaUrl(it.url),
      hue: (it.category ? CATEGORY_HUE[it.category] : undefined) ?? 330,
    }));
}

/** Normaliza el contenido estático de `data.ts` a {@link DisplayItem}. */
function fromStatic(): DisplayItem[] {
  return galleryItems.map((g) => ({
    id: g.id,
    category: g.category,
    caption: g.caption,
    alt: g.alt,
    src: g.image,
    hue: g.hue,
  }));
}

/**
 * Galería en CARRUSEL: pocas fotos grandes a la vez, scroll horizontal con
 * scroll-snap y flechas prev/next. El scroll ocurre DENTRO del contenedor (la
 * página nunca hace scroll horizontal). Filtros por las categorías de la
 * clienta. Usa las fotos del CMS (prop `items`) si las hay; si no, cae al
 * contenido estático.
 */
export function Gallery({ items }: GalleryProps = {}): React.JSX.Element {
  const t = useTranslations('gallery');
  const [filter, setFilter] = React.useState<Filter>('all');
  const trackRef = React.useRef<HTMLUListElement>(null);

  const displayItems = React.useMemo<DisplayItem[]>(() => {
    const api = Array.isArray(items) ? fromApi(items) : [];
    return api.length > 0 ? api : fromStatic();
  }, [items]);

  const filtered = React.useMemo(
    () => (filter === 'all' ? displayItems : displayItems.filter((g) => g.category === filter)),
    [filter, displayItems],
  );

  // Al cambiar de filtro, volvemos al inicio del carrusel.
  React.useEffect(() => {
    trackRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [filter]);

  const scrollByCards = (direction: 1 | -1): void => {
    const track = trackRef.current;
    if (!track) return;
    // Avanza ~85% del ancho visible (una tanda de fotos).
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section id="galeria" className="relative bg-cream py-16 sm:py-24">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle index="04" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

          <div className="flex flex-wrap gap-x-6 gap-y-2 lg:justify-end">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  'relative pb-1 text-sm font-medium uppercase tracking-wider transition-colors',
                  filter === f ? 'text-brand-600' : 'text-ink-soft hover:text-ink',
                )}
              >
                {t(`filters.${f}`)}
                {filter === f ? (
                  <motion.span
                    layoutId="gallery-filter-underline"
                    className="absolute inset-x-0 -bottom-0.5 h-px bg-gold"
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-10">
          <ul
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {filtered.map((item) => (
              <li
                key={item.id}
                className="group relative aspect-[4/5] w-[82%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-gold/25 shadow-soft sm:aspect-[3/4] sm:w-[56%] lg:w-[40%] xl:w-[32%]"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `linear-gradient(135deg, hsl(${item.hue} 85% 72%), hsl(${item.hue - 20} 70% 42%))`,
                  }}
                  aria-hidden="true"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {item.caption ? (
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/80 via-ink/10 to-transparent p-5">
                    <span className="font-serif text-lg font-medium italic text-cream">
                      {item.caption}
                    </span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Flechas de navegación (ocultas cuando no hay overflow real gracias al scroll). */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              aria-label={t('prev')}
              className="flex size-11 items-center justify-center rounded-full border border-gold/40 bg-surface text-brand-600 shadow-soft transition-colors hover:bg-cream-deep"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              aria-label={t('next')}
              className="flex size-11 items-center justify-center rounded-full border border-gold/40 bg-surface text-brand-600 shadow-soft transition-colors hover:bg-cream-deep"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
