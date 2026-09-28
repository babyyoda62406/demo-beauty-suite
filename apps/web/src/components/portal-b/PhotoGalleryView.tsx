'use client';

import * as React from 'react';
import { ArrowRight, Images } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/common';
import { cn } from '@/lib/utils';
import { usePublicGallery, type GalleryItem } from '@/lib/hooks/gallery';
import { mediaUrl } from '@/lib/media';

/**
 * Galería de "antes / después" del salón (`/portal/fotos`).
 *
 * Fuente: `GET /content/gallery` (pública, `apps/api/.../gallery.controller.ts`),
 * filtrada a `isBeforeAfter=true`. Es la galería compartida del salón, no un
 * recorte por clienta — ver la nota de gap de backend en
 * `@/lib/hooks/gallery.ts` (no existe hoy un endpoint de fotos propio de la
 * clienta accesible con rol `CLIENT`).
 */
export function PhotoGalleryView(): React.JSX.Element {
  const beforeAfterQuery = usePublicGallery({ isBeforeAfter: true });
  const designsQuery = usePublicGallery({ isBeforeAfter: false });
  const [preview, setPreview] = React.useState<GalleryItem | null>(null);

  const isLoading = beforeAfterQuery.isLoading || designsQuery.isLoading;
  const error = beforeAfterQuery.error ?? designsQuery.error;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void beforeAfterQuery.refetch();
          void designsQuery.refetch();
        }}
      />
    );
  }

  const pairs = (beforeAfterQuery.data ?? []).filter((item) => item.beforeUrl && item.afterUrl);
  const designs = designsQuery.data ?? [];

  if (pairs.length === 0 && designs.length === 0) {
    return (
      <EmptyState
        icon={Images}
        title="Todavía no hay fotos"
        description="Cuando el salón publique tus transformaciones de antes/después o diseños, las verás aquí."
      />
    );
  }

  return (
    <div className="space-y-10">
      {pairs.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-ink">Antes / después</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pairs.map((item) => (
              <BeforeAfterCard key={item.id} item={item} onOpen={() => setPreview(item)} />
            ))}
          </div>
        </section>
      ) : null}

      {designs.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-ink">Diseños</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {designs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreview(item)}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-brand-100/70 bg-surface-subtle shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(item.url)}
                  alt={item.caption ?? 'Diseño de uñas'}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="sr-only">
            {preview?.caption ?? 'Vista previa de la foto'}
          </DialogTitle>
          {preview ? (
            <div className="space-y-3">
              {preview.beforeUrl && preview.afterUrl ? (
                <div className="grid grid-cols-2 gap-2">
                  <figure className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.beforeUrl} alt="Antes" className="aspect-square w-full rounded-xl object-cover" />
                    <figcaption className="text-center text-xs font-medium text-ink-soft">Antes</figcaption>
                  </figure>
                  <figure className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.afterUrl} alt="Después" className="aspect-square w-full rounded-xl object-cover" />
                    <figcaption className="text-center text-xs font-medium text-ink-soft">Después</figcaption>
                  </figure>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(preview.url)} alt={preview.caption ?? ''} className="max-h-[70vh] w-full rounded-xl object-contain" />
              )}
              {preview.caption ? (
                <p className="text-center text-sm text-ink-soft/80">{preview.caption}</p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BeforeAfterCard({
  item,
  onOpen,
}: {
  item: GalleryItem;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-brand-100/70 bg-white shadow-card transition-shadow hover:shadow-glow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
      )}
    >
      <div className="grid grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.beforeUrl ?? ''} alt="Antes" className="aspect-square w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.afterUrl ?? ''} alt="Después" className="aspect-square w-full object-cover" />
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="truncate text-sm text-ink-soft/80">{item.caption ?? 'Transformación'}</span>
        <ArrowRight className="size-4 shrink-0 text-brand-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </button>
  );
}
