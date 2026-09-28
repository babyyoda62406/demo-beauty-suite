'use client';

import * as React from 'react';
import {
  Controller,
  useFormContext,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Input, Label, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Props comunes a todos los campos conectados a react-hook-form. */
interface BaseFieldProps<T extends FieldValues> {
  /** Ruta del campo dentro del formulario. */
  name: Path<T>;
  label?: string;
  /** Texto de ayuda bajo la etiqueta. */
  description?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

/** Recupera el mensaje de error de una ruta anidada (`a.b.c`). */
function errorAt(errors: Record<string, unknown>, path: string): string | undefined {
  const node = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors);
  if (node && typeof node === 'object' && 'message' in node) {
    const message = (node as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

/** Envoltorio: etiqueta, indicador de obligatorio, ayuda y mensaje de error. */
function Field({
  id,
  label,
  description,
  required,
  error,
  className,
  children,
}: {
  id: string;
  label?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  error?: string | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  const describedBy = [
    description ? `${id}-desc` : null,
    error ? `${id}-err` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </Label>
      ) : null}
      {description ? (
        <p id={`${id}-desc`} className="text-xs text-ink-soft/70">
          {description}
        </p>
      ) : null}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy || undefined,
          })
        : children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// FieldText
// -----------------------------------------------------------------------------

export interface FieldTextProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
}

export function FieldText<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  disabled,
  placeholder,
  type = 'text',
  autoComplete,
}: FieldTextProps<T>): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} description={description} required={required} error={errorAt(errors, name)} className={className}>
      <Input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        {...register(name)}
      />
    </Field>
  );
}

// -----------------------------------------------------------------------------
// FieldNumber (transforma a number; soporta importes en céntimos vía step)
// -----------------------------------------------------------------------------

export interface FieldNumberProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Sufijo visual, p.ej. "€", "min". */
  suffix?: string;
}

export function FieldNumber<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  disabled,
  placeholder,
  min,
  max,
  step,
  suffix,
}: FieldNumberProps<T>): React.JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} description={description} required={required} error={errorAt(errors, name)} className={className}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className={cn(suffix && 'pr-12')}
              value={field.value ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === '' ? undefined : Number(v));
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
            {suffix ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft/60">
                {suffix}
              </span>
            ) : null}
          </div>
        )}
      />
    </Field>
  );
}

// -----------------------------------------------------------------------------
// FieldTextarea
// -----------------------------------------------------------------------------

export interface FieldTextareaProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string;
  rows?: number;
}

export function FieldTextarea<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  disabled,
  placeholder,
  rows = 4,
}: FieldTextareaProps<T>): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} description={description} required={required} error={errorAt(errors, name)} className={className}>
      <Textarea rows={rows} placeholder={placeholder} disabled={disabled} {...register(name)} />
    </Field>
  );
}

// -----------------------------------------------------------------------------
// FieldSelect (select nativo estilizado — no hay primitivo Select en @fgd/ui)
// -----------------------------------------------------------------------------

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FieldSelectProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: SelectOption[];
  placeholder?: string;
}

export function FieldSelect<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  disabled,
  options,
  placeholder,
}: FieldSelectProps<T>): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} description={description} required={required} error={errorAt(errors, name)} className={className}>
      <select
        disabled={disabled}
        className={cn(
          'flex h-11 w-full appearance-none rounded-xl border border-brand-100 bg-white bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat px-4 py-2 pr-10 text-sm text-ink shadow-sm transition-colors',
          'focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/30',
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%239d0e4b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...register(name)}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
