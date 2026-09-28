'use client';

import * as React from 'react';
import { useFormContext, type FieldValues, type Path } from 'react-hook-form';

export interface FieldCheckboxProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  /** Texto de ayuda bajo la etiqueta. */
  description?: string;
  disabled?: boolean;
}

/**
 * Casilla booleana conectada a react-hook-form (no hay primitivo Switch en
 * `@fgd/ui`). Reutilizable en cualquier `FormDialog` del CMS para campos como
 * `active`, `approved` o `isBeforeAfter`.
 */
export function FieldCheckbox<T extends FieldValues>({
  name,
  label,
  description,
  disabled,
}: FieldCheckboxProps<T>): React.JSX.Element {
  const { register } = useFormContext<T>();
  const id = `field-${name}`;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
      <input
        id={id}
        type="checkbox"
        disabled={disabled}
        className="mt-0.5 size-4 rounded border-brand-200 text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
        {...register(name)}
      />
      <span>
        <span className="font-medium">{label}</span>
        {description ? <span className="block text-xs text-ink-soft/70">{description}</span> : null}
      </span>
    </label>
  );
}
