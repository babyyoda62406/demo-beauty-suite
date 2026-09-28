'use client';

import * as React from 'react';
import { useController, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { ImageUpload } from '@/components/common';

export interface FieldImageUploadProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  aspect?: 'square' | 'video' | 'portrait';
}

/**
 * Adaptador de {@link ImageUpload} para react-hook-form: guarda la `url`
 * relativa devuelta por la subida en el campo indicado. Reutilizable en
 * cualquier `FormDialog` del CMS.
 */
export function FieldImageUpload<T extends FieldValues>({
  name,
  label = 'Foto',
  aspect = 'video',
}: FieldImageUploadProps<T>): React.JSX.Element {
  const { control } = useFormContext<T>();
  const { field, fieldState } = useController<T>({ name, control });
  return (
    <div className="space-y-1">
      <ImageUpload
        label={label}
        aspect={aspect}
        value={(field.value as string | null | undefined) ?? ''}
        onChange={(url) => field.onChange(url)}
      />
      {/* Sin esto, un valor que el esquema rechace deja el formulario mudo: se
          pulsa Guardar, no pasa nada y no hay forma de saber por qué. */}
      {fieldState.error?.message ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
