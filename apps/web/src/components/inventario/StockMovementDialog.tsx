'use client';

import * as React from 'react';
import { z } from 'zod';
import { FormDialog, FieldSelect, FieldNumber, FieldTextarea } from '@/components/common';
import type { CreateStockMovementInput, Product, StockMovementKind } from '@/lib/hooks/inventory';

const KIND_OPTIONS: { value: StockMovementKind; label: string }[] = [
  { value: 'IN', label: 'Entrada (+)' },
  { value: 'OUT', label: 'Salida (−)' },
  { value: 'ADJUST', label: 'Ajuste (fija el stock)' },
];

const stockMovementSchema = z.object({
  kind: z.enum(['IN', 'OUT', 'ADJUST']),
  quantity: z.coerce.number({ invalid_type_error: 'Obligatorio' }).int('Debe ser un número entero').min(0, 'No puede ser negativo'),
  reason: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

export type StockMovementFormValues = z.infer<typeof stockMovementSchema>;

export interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | undefined;
  onSubmit: (values: CreateStockMovementInput) => Promise<void>;
}

/** Modal para registrar un movimiento de stock (IN/OUT/ADJUST) de un producto. */
export function StockMovementDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
}: StockMovementDialogProps): React.JSX.Element {
  const defaultValues: StockMovementFormValues = { kind: 'IN', quantity: 1, reason: '' };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={product ? `Ajustar stock — ${product.name}` : 'Ajustar stock'}
      {...(product
        ? {
            description: `Stock actual: ${product.stock} uds. Entrada/salida suman o restan; el ajuste fija el stock al valor indicado.`,
          }
        : {})}
      schema={stockMovementSchema}
      defaultValues={defaultValues}
      submitLabel="Registrar movimiento"
      onSubmit={async (values) => {
        await onSubmit({
          kind: values.kind,
          quantity: values.quantity,
          ...(values.reason ? { reason: values.reason } : {}),
        });
      }}
    >
      <FieldSelect<StockMovementFormValues> name="kind" label="Tipo de movimiento" required options={KIND_OPTIONS} />
      <FieldNumber<StockMovementFormValues>
        name="quantity"
        label="Cantidad"
        required
        min={0}
        step={1}
        suffix="uds."
        description="Para IN/OUT, unidades a mover. Para ADJUST, el stock final."
      />
      <FieldTextarea<StockMovementFormValues>
        name="reason"
        label="Motivo (opcional)"
        placeholder="Recepción de pedido, rotura, inventario físico…"
        rows={3}
      />
    </FormDialog>
  );
}
