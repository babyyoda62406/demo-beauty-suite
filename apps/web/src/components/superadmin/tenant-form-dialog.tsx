'use client';

import * as React from 'react';
import { z } from 'zod';
import { FormDialog, FieldText, FieldSelect } from '@/components/common';
import {
  PLAN_KEYS,
  PLAN_LABELS,
  TENANT_STATUSES,
  TENANT_STATUS_LABELS,
  type CreateTenantInput,
} from '@/lib/hooks/superadmin';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const schema = z.object({
  name: z.string().min(2, 'Introduce el nombre del salón.').max(160),
  slug: z
    .string()
    .min(2, 'El slug es obligatorio.')
    .max(63)
    .regex(SLUG_PATTERN, 'Sólo minúsculas, números y guiones (p. ej. "aurora-").'),
  legalName: z.string().max(200).optional().or(z.literal('')),
  planKey: z.enum(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']),
  status: z.enum(['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED']),
  email: z.string().email('Correo no válido.').optional().or(z.literal('')),
  phone: z.string().max(32).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateTenantInput) => Promise<void>;
}

/** Diálogo de alta de salón (tenant) para la plataforma (SUPERADMIN). */
export function TenantFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: TenantFormDialogProps): React.JSX.Element {
  const defaults: FormValues = {
    name: '',
    slug: '',
    legalName: '',
    planKey: 'STARTER',
    status: 'TRIAL',
    email: '',
    phone: '',
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Alta de salón"
      description="Crea un nuevo salón en la plataforma. El slug identifica la marca blanca y debe ser único."
      schema={schema}
      defaultValues={defaults}
      submitLabel="Crear salón"
      onSubmit={async (values) => {
        const payload: CreateTenantInput = {
          name: values.name,
          slug: values.slug,
          planKey: values.planKey,
          status: values.status,
          ...(values.legalName ? { legalName: values.legalName } : {}),
          ...(values.email ? { email: values.email } : {}),
          ...(values.phone ? { phone: values.phone } : {}),
        };
        await onSubmit(payload);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldText<FormValues>
          name="name"
          label="Nombre comercial"
          placeholder="Estudio Aurora"
          required
        />
        <FieldText<FormValues>
          name="slug"
          label="Slug (marca blanca)"
          placeholder="aurora-"
          required
        />
      </div>
      <FieldText<FormValues>
        name="legalName"
        label="Razón social"
        placeholder="Opcional"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect<FormValues>
          name="planKey"
          label="Plan"
          options={PLAN_KEYS.map((k) => ({ value: k, label: PLAN_LABELS[k] }))}
        />
        <FieldSelect<FormValues>
          name="status"
          label="Estado"
          options={TENANT_STATUSES.map((s) => ({ value: s, label: TENANT_STATUS_LABELS[s] }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldText<FormValues>
          name="email"
          label="Email de contacto"
          type="email"
          placeholder="hola@salon.com"
        />
        <FieldText<FormValues> name="phone" label="Teléfono" placeholder="+34 600 000 000" />
      </div>
    </FormDialog>
  );
}
