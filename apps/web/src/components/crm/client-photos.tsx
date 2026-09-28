'use client';

import * as React from 'react';
import { ImagePlus, Images } from 'lucide-react';
import { Badge, Button, useToast } from '@/components/ui';
import { EmptyState } from '@/components/common';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  useAddClientPhoto,
  type ClientBooking,
  type ClientPhoto,
  type ClientPhotoInput,
  type PhotoKind,
} from '@/lib/hooks/clients';
import { AddPhotoDialog } from './add-photo-dialog';
import { mediaUrl } from '@/lib/media';

const KIND_LABEL: Record<PhotoKind, string> = {
  BEFORE: 'Antes',
  AFTER: 'Después',
  DESIGN: 'Diseño',
};

const KIND_VARIANT: Record<PhotoKind, 'warning' | 'success' | 'brand'> = {
  BEFORE: 'warning',
  AFTER: 'success',
  DESIGN: 'brand',
};

type Filter = 'ALL' | PhotoKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'BEFORE', label: 'Antes' },
  { value: 'AFTER', label: 'Después' },
  { value: 'DESIGN', label: 'Diseño' },
];

/**
 * Pestaña "Fotos": galería antes/después/diseño con filtro por tipo y alta de
 * nuevas fotos. Owns su diálogo y mutación para mantener la ficha desacoplada.
 */
export function ClientPhotos({
  clientId,
  photos,
  bookings,
}: {
  clientId: string;
  photos: ClientPhoto[];
  bookings: ClientBooking[];
}): React.JSX.Element {
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<Filter>('ALL');
  const [open, setOpen] = React.useState(false);
  const addPhoto = useAddClientPhoto();

  const visible = filter === 'ALL' ? photos : photos.filter((p) => p.kind === filter);

  const handleAdd = async (photo: ClientPhotoInput): Promise<void> => {
    await addPhoto.mutateAsync({ id: clientId, photo });
    toast({ variant: 'success', title: 'Foto añadida', description: 'La imagen se guardó en la ficha.' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar fotos por tipo">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count =
              f.value === 'ALL' ? photos.length : photos.filter((p) => p.kind === f.value).length;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                  active
                    ? 'bg-brand-gradient text-white shadow-soft'
                    : 'bg-brand-50 text-ink-soft hover:bg-brand-100',
                )}
              >
                {f.label}
                <span className={cn('tabular-nums', active ? 'text-white/80' : 'text-ink-soft/60')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <ImagePlus aria-hidden="true" />
          Añadir foto
        </Button>
      </div>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((photo) => (
            <li
              key={photo.id}
              className="group overflow-hidden rounded-2xl border border-brand-100/70 bg-white shadow-card"
            >
              <div className="relative aspect-square overflow-hidden bg-surface-subtle">
                {/* Imágenes externas de CDN → <img> nativo con lazy-load. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(photo.url)}
                  alt={`Foto (${KIND_LABEL[photo.kind]})`}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute left-2 top-2">
                  <Badge variant={KIND_VARIANT[photo.kind]}>{KIND_LABEL[photo.kind]}</Badge>
                </span>
              </div>
              <p className="px-3 py-2 text-xs text-ink-soft/70">{formatDate(photo.createdAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Images}
          title={filter === 'ALL' ? 'Sin fotos' : 'Sin fotos de este tipo'}
          description="Añade fotos de antes, después o diseño para documentar el trabajo."
          action={
            <Button onClick={() => setOpen(true)} size="sm">
              <ImagePlus aria-hidden="true" />
              Añadir foto
            </Button>
          }
        />
      )}

      <AddPhotoDialog open={open} onOpenChange={setOpen} bookings={bookings} onSubmit={handleAdd} />
    </div>
  );
}
