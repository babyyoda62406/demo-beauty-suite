'use client';

import * as React from 'react';
import { z } from 'zod';
import { FieldSelect, FormDialog, type SelectOption } from '@/components/common';
import { FieldImageUpload } from '@/components/cms/field-image-upload';
import { imageRef } from '@/lib/validation';
import type { ClientBooking, ClientPhotoInput, PhotoKind } from '@/lib/hooks/clients';
import { formatDate } from '@/lib/format';

const photoSchema = z.object({
  url: imageRef()
    .refine((v) => Boolean(v), 'Sube una foto')
    .transform((v) => v as string),
  kind: z.enum(['BEFORE', 'AFTER', 'DESIGN']),
  bookingId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
});

const KIND_OPTIONS: SelectOption[] = [
  { value: 'DESIGN', label: 'Diseño' },
  { value: 'BEFORE', label: 'Antes' },
  { value: 'AFTER', label: 'Después' },
];

export interface AddPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Citas de la clienta para asociar la foto (opcional). */
  bookings: ClientBooking[];
  onSubmit: (photo: ClientPhotoInput) => Promise<void>;
}

/**
 * Diálogo para adjuntar una foto (antes/después/diseño) a la ficha, con enlace
 * opcional a una cita de la misma clienta (POST /clients/:id/photos).
 */
export function AddPhotoDialog({
  open,
  onOpenChange,
  bookings,
  onSubmit,
}: AddPhotoDialogProps): React.JSX.Element {
  const bookingOptions: SelectOption[] = [
    { value: '', label: 'Sin cita asociada' },
    ...bookings.map((b) => ({
      value: b.id,
      label: `${b.service?.name ?? 'Cita'} · ${formatDate(b.startAt, 'd MMM yyyy')}`,
    })),
  ];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Añadir foto"
      description="Adjunta una imagen de antes, después o diseño."
      schema={photoSchema}
      defaultValues={{ url: '', kind: 'DESIGN', bookingId: '' }}
      submitLabel="Añadir foto"
      onSubmit={(values) =>
        onSubmit({
          url: values.url,
          kind: values.kind as PhotoKind,
          ...(values.bookingId ? { bookingId: values.bookingId } : {}),
        })
      }
    >
      <FieldImageUpload name="url" label="Foto" aspect="portrait" />
      <FieldSelect name="kind" label="Tipo" options={KIND_OPTIONS} />
      {bookings.length > 0 ? (
        <FieldSelect name="bookingId" label="Cita asociada" options={bookingOptions} />
      ) : null}
    </FormDialog>
  );
}
