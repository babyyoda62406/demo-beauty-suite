'use client';

import * as React from 'react';
import { z } from 'zod';
import { FormDialog, FieldText, FieldNumber, FieldTextarea, FieldSelect } from '@/components/common';
import { PLAN_KEYS, PLAN_LABELS, type Plan, type PlanInput, type PlanKey } from '@/lib/hooks/superadmin';

/** Valida y normaliza un objeto JSON libre (features / moduleFlags). */
const jsonRecord = z
  .string()
  .transform((raw, ctx) => {
    const trimmed = raw.trim();
    if (!trimmed) return {} as Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe ser un objeto JSON.' });
      return z.NEVER;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JSON no válido.' });
      return z.NEVER;
    }
  });

const baseShape = {
  name: z.string().min(1, 'Introduce el nombre del plan.').max(120),
  priceMonthly: z
    .number({ invalid_type_error: 'Introduce un precio.' })
    .min(0, 'El precio no puede ser negativo.'),
  currency: z.string().length(3, 'Usa el código ISO de 3 letras (p. ej. EUR).'),
  features: jsonRecord,
  moduleFlags: jsonRecord,
};

const createSchema = z.object({
  key: z.enum(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']),
  ...baseShape,
});
const editSchema = z.object(baseShape);

export interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan a editar; ausente = alta. */
  plan?: Plan | undefined;
  /** Claves de plan ya usadas (para evitar duplicados en el alta). */
  usedKeys: PlanKey[];
  onSubmit: (values: PlanInput, isEdit: boolean) => Promise<void>;
}

/** Diálogo de alta/edición de un plan de plataforma (SUPERADMIN, SPEC §6). */
export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  usedKeys,
  onSubmit,
}: PlanFormDialogProps): React.JSX.Element {
  const isEdit = Boolean(plan);

  if (isEdit && plan) {
    const defaults = {
      name: plan.name,
      priceMonthly: plan.priceMonthly / 100,
      currency: plan.currency,
      features: JSON.stringify(plan.features ?? {}, null, 2),
      moduleFlags: JSON.stringify(plan.moduleFlags ?? {}, null, 2),
    };
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Editar plan · ${PLAN_LABELS[plan.key] ?? plan.key}`}
        description="Actualiza el precio y las características del plan. La clave del plan no se puede cambiar."
        schema={editSchema}
        defaultValues={defaults}
        submitLabel="Guardar plan"
        onSubmit={async (values) => {
          await onSubmit(
            {
              name: values.name,
              priceMonthly: Math.round(values.priceMonthly * 100),
              currency: values.currency.toUpperCase(),
              features: values.features,
              moduleFlags: values.moduleFlags,
            },
            true,
          );
        }}
      >
        <PlanFields showKey={false} />
      </FormDialog>
    );
  }

  const available = PLAN_KEYS.filter((k) => !usedKeys.includes(k));
  const defaults = {
    key: (available[0] ?? 'STARTER') as PlanKey,
    name: '',
    priceMonthly: 0,
    currency: 'EUR',
    features: '{}',
    moduleFlags: '{}',
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo plan"
      description="Crea un plan de plataforma. El precio se guarda mensual; los importes se muestran en euros."
      schema={createSchema}
      defaultValues={defaults}
      submitLabel="Crear plan"
      onSubmit={async (values) => {
        await onSubmit(
          {
            key: values.key,
            name: values.name,
            priceMonthly: Math.round(values.priceMonthly * 100),
            currency: values.currency.toUpperCase(),
            features: values.features,
            moduleFlags: values.moduleFlags,
          },
          false,
        );
      }}
    >
      <PlanFields
        showKey
        keyOptions={PLAN_KEYS.map((k) => ({
          value: k,
          label: PLAN_LABELS[k],
          disabled: usedKeys.includes(k),
        }))}
      />
    </FormDialog>
  );
}

/** Campos compartidos por alta y edición. Los tipos son laxos a propósito. */
function PlanFields({
  showKey,
  keyOptions,
}: {
  showKey: boolean;
  keyOptions?: { value: string; label: string; disabled?: boolean }[];
}): React.JSX.Element {
  return (
    <>
      {showKey && keyOptions ? (
        <FieldSelect
          name="key"
          label="Clave del plan"
          description="Identificador único e inmutable del plan."
          options={keyOptions}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <FieldText name="name" label="Nombre" placeholder="Professional" required className="sm:col-span-2" />
        <FieldText name="currency" label="Moneda" placeholder="EUR" />
      </div>
      <FieldNumber
        name="priceMonthly"
        label="Precio mensual"
        min={0}
        step={0.01}
        suffix="€"
        description="Importe mensual del plan (se almacena en céntimos)."
      />
      <FieldTextarea
        name="features"
        label="Características (JSON)"
        rows={4}
        description='Objeto JSON libre, p. ej. {"soporte": "prioritario", "usuarios": 10}.'
      />
      <FieldTextarea
        name="moduleFlags"
        label="Módulos activados (JSON)"
        rows={4}
        description='Objeto JSON de flags de módulos, p. ej. {"store": true, "marketing": false}.'
      />
    </>
  );
}
