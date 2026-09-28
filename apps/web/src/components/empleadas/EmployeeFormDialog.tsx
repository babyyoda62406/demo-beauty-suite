'use client';

import * as React from 'react';
import { z } from 'zod';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormDialog, FieldText, FieldNumber, FieldTextarea } from '@/components/common';
import { FieldImageUpload } from '@/components/cms/field-image-upload';
import type { Employee, EmployeeInput } from '@/lib/hooks/employees';

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Esquema de alta/edición de profesional. La comisión se captura en % (0–100)
 * y se convierte a puntos básicos al enviar (15 % → 1500), y el salario en
 * euros/mes y se convierte a céntimos (SPEC: dinero siempre en céntimos).
 */
const employeeSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(160, 'Máximo 160 caracteres'),
  title: z.string().max(120, 'Máximo 120 caracteres').optional(),
  phone: z.string().max(32, 'Máximo 32 caracteres').optional(),
  email: z.string().email('Email no válido').max(160).optional().or(z.literal('')),
  photoUrl: z.string().max(2048, 'Máximo 2048 caracteres').optional(),
  color: z
    .string()
    .regex(HEX_COLOR_REGEX, 'Debe ser un color hexadecimal (#RRGGBB)')
    .optional()
    .or(z.literal('')),
  commissionPercent: z.coerce.number().min(0, 'No puede ser negativo').max(100, 'Máximo 100 %').optional(),
  salaryEuros: z.coerce.number().min(0, 'No puede ser negativo').optional(),
  hireDate: z.string().optional(),
  active: z.boolean().optional(),
  bookable: z.boolean().optional(),
  bio: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
  specialties: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Profesional a editar; `undefined` = alta. */
  employee?: Employee | undefined;
  onSubmit: (values: EmployeeInput) => Promise<void>;
}

/** Modal de alta/edición de profesional (nombre, título, contacto, color de agenda, comisión, salario). */
export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSubmit,
}: EmployeeFormDialogProps): React.JSX.Element {
  const defaultValues: EmployeeFormValues = {
    name: employee?.name ?? '',
    title: employee?.title ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    photoUrl: employee?.photoUrl ?? '',
    color: employee?.color ?? '#D6157F',
    commissionPercent: employee?.commissionRate != null ? employee.commissionRate / 100 : undefined,
    salaryEuros: employee?.salary != null ? employee.salary / 100 : undefined,
    hireDate: employee?.hireDate ? employee.hireDate.slice(0, 10) : '',
    active: employee?.active ?? true,
    bookable: employee?.bookable ?? true,
    bio: employee?.bio ?? '',
    specialties: employee?.specialties ?? '',
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={employee ? 'Editar profesional' : 'Nuevo profesional'}
      description="La comisión se guarda en puntos básicos y el salario en céntimos; introdúcelos en % y euros."
      schema={employeeSchema}
      defaultValues={defaultValues}
      submitLabel={employee ? 'Guardar cambios' : 'Crear profesional'}
      onSubmit={async (values) => {
        await onSubmit({
          name: values.name,
          ...(values.title ? { title: values.title } : {}),
          ...(values.phone ? { phone: values.phone } : {}),
          ...(values.email ? { email: values.email } : {}),
          ...(values.photoUrl ? { photoUrl: values.photoUrl } : {}),
          ...(values.color ? { color: values.color } : {}),
          ...(values.commissionPercent != null
            ? { commissionRate: Math.round(values.commissionPercent * 100) }
            : {}),
          ...(values.salaryEuros != null ? { salary: Math.round(values.salaryEuros * 100) } : {}),
          ...(values.hireDate ? { hireDate: new Date(values.hireDate).toISOString() } : {}),
          active: values.active ?? true,
          bookable: values.bookable ?? true,
          ...(values.bio ? { bio: values.bio } : {}),
          ...(values.specialties ? { specialties: values.specialties } : {}),
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText<EmployeeFormValues> name="name" label="Nombre" required placeholder="Estudio Aurora" />
        <FieldText<EmployeeFormValues> name="title" label="Título" placeholder="Nail artist" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText<EmployeeFormValues> name="phone" label="Teléfono" placeholder="+34 600 111 222" />
        <FieldText<EmployeeFormValues> name="email" label="Email" type="email" placeholder="aurora@example.com" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <FieldText<EmployeeFormValues> name="color" label="Color de agenda" placeholder="#D6157F" />
        <ColorSwatch />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldNumber<EmployeeFormValues> name="commissionPercent" label="Comisión" min={0} max={100} step={1} suffix="%" />
        <FieldNumber<EmployeeFormValues> name="salaryEuros" label="Salario mensual" min={0} step={0.01} suffix="€" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText<EmployeeFormValues> name="hireDate" label="Fecha de alta" type="date" />
        <FieldImageUpload<EmployeeFormValues> name="photoUrl" label="Foto" aspect="square" />
      </div>

      <FieldTextarea<EmployeeFormValues> name="specialties" label="Especialidades" placeholder="Acrílico, gel, nail art" rows={2} />
      <FieldTextarea<EmployeeFormValues> name="bio" label="Biografía" placeholder="Especialista en uñas acrílicas." rows={3} />

      <div className="flex flex-wrap gap-6">
        <CheckboxField<EmployeeFormValues> name="active" label="Profesional activo" />
        <CheckboxField<EmployeeFormValues> name="bookable" label="Reservable en agenda pública" />
      </div>
    </FormDialog>
  );
}

/** Previsualización del color de agenda seleccionado. */
function ColorSwatch(): React.JSX.Element {
  const { control } = useFormContext<EmployeeFormValues>();
  const value = useWatch<EmployeeFormValues, 'color'>({ control, name: 'color' });
  const isValid = typeof value === 'string' && HEX_COLOR_REGEX.test(value);
  return (
    <div className="flex items-end pb-1.5">
      <span
        className="size-11 rounded-xl border border-brand-100 shadow-sm"
        style={{ backgroundColor: isValid ? value : '#D6157F' }}
        aria-hidden="true"
      />
    </div>
  );
}

/** Checkbox mínimo conectado a react-hook-form (no hay primitivo Switch en @fgd/ui). */
function CheckboxField<T extends Record<string, unknown>>({
  name,
  label,
}: {
  name: keyof T & string;
  label: string;
}): React.JSX.Element {
  const id = `field-${name}`;
  const { register } = useFormContext<T>();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        id={id}
        type="checkbox"
        className="size-4 rounded border-brand-200 text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        {...register(name as never)}
      />
      {label}
    </label>
  );
}
