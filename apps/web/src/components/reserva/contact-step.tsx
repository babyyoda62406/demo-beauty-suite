'use client';

import * as React from 'react';
import Link from 'next/link';
import { Controller, useFormContext } from 'react-hook-form';
import { FieldText, FieldTextarea } from '@/components/common';
import { cn } from '@/lib/utils';
import type { BookingFormValues } from './schema';

/** Paso 4 — datos de contacto de la clienta + consentimiento. */
export function ContactStep(): React.JSX.Element {
  const { control, formState } = useFormContext<BookingFormValues>();
  const consentError = formState.errors.consent?.message;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldText<BookingFormValues>
          name="name"
          label="Nombre y apellidos"
          placeholder="Laura García"
          autoComplete="name"
          required
        />
        <FieldText<BookingFormValues>
          name="phone"
          label="Teléfono"
          type="tel"
          placeholder="+34 600 111 222"
          autoComplete="tel"
          required
        />
      </div>

      <FieldText<BookingFormValues>
        name="email"
        label="Correo electrónico"
        type="email"
        placeholder="laura@email.com (opcional)"
        autoComplete="email"
        description="Te enviaremos la confirmación si nos lo dejas."
      />

      <FieldTextarea<BookingFormValues>
        name="notes"
        label="Notas o preferencias"
        placeholder="Diseño que te gustaría, alergias, comentarios…"
        rows={3}
      />

      {/* Consentimiento */}
      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <div className="space-y-1.5">
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface p-4 transition-colors',
                consentError ? 'border-danger/50' : 'border-gold/30 hover:border-brand-300',
              )}
            >
              <input
                type="checkbox"
                checked={field.value === true}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={consentError ? true : undefined}
                className="mt-0.5 size-5 shrink-0 rounded border-brand-200 text-brand-500 accent-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              />
              <span className="text-sm text-ink-soft/85">
                He leído y acepto la{' '}
                <Link
                  href="/privacidad"
                  target="_blank"
                  className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
                >
                  política de privacidad
                </Link>{' '}
                y el tratamiento de mis datos para gestionar la reserva.
              </span>
            </label>
            {consentError ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {consentError}
              </p>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
