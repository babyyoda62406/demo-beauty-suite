'use client';

import * as React from 'react';
import { z } from 'zod';
import { FieldText, FieldTextarea, FormDialog } from '@/components/common';
import { FieldImageUpload } from '@/components/cms/field-image-upload';
import { imageRef } from '@/lib/validation';
import type { Client, ClientInput } from '@/lib/hooks/clients';

/** Texto opcional recortado: cadena vacía → `undefined`. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed ? trimmed : undefined;
    });

/** Esquema de alta/edición de clienta (alineado con `CreateClientDto`). */
export const clientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Introduce el nombre (mínimo 2 caracteres)')
    .max(160, 'Máximo 160 caracteres'),
  phone: z
    .string()
    .trim()
    .min(3, 'Introduce un teléfono válido')
    .max(32, 'Máximo 32 caracteres'),
  email: z
    .union([z.literal(''), z.string().email('Correo electrónico no válido').max(160)])
    .optional()
    .transform((v) => (v ? v : undefined)),
  instagram: optionalText(80),
  birthDate: optionalText(10),
  photoUrl: imageRef().transform((v) => (v ? v : undefined)),
  allergies: optionalText(2000),
  preferences: optionalText(2000),
  favoriteColors: optionalText(500),
});

export type ClientFormValues = z.output<typeof clientFormSchema>;

/** Valores por defecto del formulario a partir de una clienta (o vacíos). */
function toDefaults(client?: Client) {
  return {
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    instagram: client?.instagram ?? '',
    // El input date espera `yyyy-MM-dd`.
    birthDate: client?.birthDate ? client.birthDate.slice(0, 10) : '',
    photoUrl: client?.photoUrl ?? '',
    allergies: client?.allergies ?? '',
    preferences: client?.preferences ?? '',
    favoriteColors: client?.favoriteColors ?? '',
  };
}

export interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, el diálogo edita; si no, crea. */
  client?: Client | undefined;
  /** Envío validado. Debe lanzar en error para mostrarlo en el diálogo. */
  onSubmit: (values: ClientInput) => Promise<void>;
}

/**
 * Diálogo de alta/edición de clienta sobre `FormDialog` (react-hook-form + zod).
 * Reúne los datos de la ficha: contacto, cumpleaños, foto, alergias,
 * preferencias y colores favoritos. Las notas privadas se editan en su pestaña.
 */
export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
}: ClientFormDialogProps): React.JSX.Element {
  const isEdit = Boolean(client);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar clienta' : 'Nueva clienta'}
      description={
        isEdit
          ? 'Actualiza los datos de la ficha.'
          : 'Añade una clienta al CRM del salón.'
      }
      schema={clientFormSchema}
      defaultValues={toDefaults(client)}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear clienta'}
      onSubmit={(values) => onSubmit(values as ClientInput)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText name="name" label="Nombre completo" placeholder="Lucía Fernández" required />
        <FieldText
          name="phone"
          label="Teléfono"
          type="tel"
          placeholder="+34 600 111 222"
          autoComplete="tel"
          required
        />
        <FieldText
          name="email"
          label="Correo electrónico"
          type="email"
          placeholder="lucia@example.com"
          autoComplete="email"
        />
        <FieldText name="instagram" label="Instagram" placeholder="@lucia.nails" />
        <FieldText name="birthDate" label="Cumpleaños" type="date" />
        <FieldImageUpload name="photoUrl" label="Foto" aspect="square" />
      </div>

      <FieldText
        name="favoriteColors"
        label="Colores favoritos"
        placeholder="Nude, rosa palo, borgoña"
      />
      <FieldTextarea
        name="allergies"
        label="Alergias"
        rows={2}
        placeholder="Alergia al níquel, esmaltes sin HEMA…"
      />
      <FieldTextarea
        name="preferences"
        label="Preferencias"
        rows={3}
        placeholder="Prefiere diseños minimalistas, cita por la mañana…"
      />
    </FormDialog>
  );
}
