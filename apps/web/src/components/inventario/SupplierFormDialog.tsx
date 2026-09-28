'use client';

import * as React from 'react';
import { z } from 'zod';
import { FormDialog, FieldText } from '@/components/common';
import type { CreateSupplierInput, Supplier } from '@/lib/hooks/inventory';

const supplierSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(160, 'Máximo 160 caracteres'),
  contact: z.string().max(160, 'Máximo 160 caracteres').optional(),
  email: z.union([z.string().email('Email no válido'), z.literal('')]).optional(),
  phone: z.string().max(32, 'Máximo 32 caracteres').optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Proveedor a editar; `undefined` = alta. */
  supplier?: Supplier | undefined;
  onSubmit: (values: CreateSupplierInput) => Promise<void>;
}

/** Modal de alta/edición de proveedor. */
export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSubmit,
}: SupplierFormDialogProps): React.JSX.Element {
  const defaultValues: SupplierFormValues = {
    name: supplier?.name ?? '',
    contact: supplier?.contact ?? '',
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      schema={supplierSchema}
      defaultValues={defaultValues}
      submitLabel={supplier ? 'Guardar cambios' : 'Crear proveedor'}
      onSubmit={async (values) => {
        await onSubmit({
          name: values.name,
          ...(values.contact ? { contact: values.contact } : {}),
          ...(values.email ? { email: values.email } : {}),
          ...(values.phone ? { phone: values.phone } : {}),
        });
      }}
    >
      <FieldText<SupplierFormValues> name="name" label="Nombre" required placeholder="Distribuciones Belleza SL" />
      <FieldText<SupplierFormValues> name="contact" label="Persona de contacto" placeholder="María López" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText<SupplierFormValues> name="email" label="Email" type="email" placeholder="ventas@belleza.example" />
        <FieldText<SupplierFormValues> name="phone" label="Teléfono" placeholder="+34 600 111 222" />
      </div>
    </FormDialog>
  );
}
