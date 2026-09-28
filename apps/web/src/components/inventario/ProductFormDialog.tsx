'use client';

import * as React from 'react';
import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { FormDialog, FieldText, FieldNumber, FieldTextarea, FieldSelect } from '@/components/common';
import { FieldImageUpload } from '@/components/cms/field-image-upload';
import { useSuppliers, type CreateProductInput, type Product } from '@/lib/hooks/inventory';

/**
 * Esquema de creación/edición de producto. El precio y el coste se capturan en
 * euros (más natural para el usuario) y se convierten a céntimos al enviar,
 * que es la unidad que espera la API (SPEC: dinero siempre en céntimos).
 */
const productSchema = z.object({
  sku: z.string().min(1, 'Obligatorio').max(64, 'Máximo 64 caracteres'),
  name: z.string().min(2, 'Mínimo 2 caracteres').max(160, 'Máximo 160 caracteres'),
  description: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
  category: z.string().max(120, 'Máximo 120 caracteres').optional(),
  priceEuros: z.coerce.number({ invalid_type_error: 'Precio obligatorio' }).min(0, 'No puede ser negativo'),
  costEuros: z.coerce.number().min(0, 'No puede ser negativo').optional(),
  stock: z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativo').optional(),
  lowStockThreshold: z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativo').optional(),
  supplierId: z.string().optional(),
  imageUrl: z.string().max(2048, 'Máximo 2048 caracteres').optional(),
  active: z.boolean().optional(),
  isStoreItem: z.boolean().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Producto a editar; `undefined` = alta. */
  product?: Product | undefined;
  onSubmit: (values: CreateProductInput) => Promise<void>;
}

/** Modal de alta/edición de producto (Productos → SKU, precio, coste, stock, umbral, proveedor). */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
}: ProductFormDialogProps): React.JSX.Element {
  const suppliersQuery = useSuppliers({ pageSize: 100, sortBy: 'name', sortOrder: 'asc' });
  const supplierOptions = React.useMemo(
    () => [
      { value: '', label: 'Sin proveedor' },
      ...(suppliersQuery.data?.data.map((s) => ({ value: s.id, label: s.name })) ?? []),
    ],
    [suppliersQuery.data],
  );

  const defaultValues: ProductFormValues = {
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? '',
    priceEuros: product ? product.price / 100 : 0,
    costEuros: product?.cost != null ? product.cost / 100 : undefined,
    stock: product?.stock ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 0,
    supplierId: product?.supplierId ?? '',
    imageUrl: product?.imageUrl ?? '',
    active: product?.active ?? true,
    isStoreItem: product?.isStoreItem ?? false,
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description="El precio y el coste se guardan en céntimos; introdúcelos en euros."
      schema={productSchema}
      defaultValues={defaultValues}
      submitLabel={product ? 'Guardar cambios' : 'Crear producto'}
      onSubmit={async (values) => {
        await onSubmit({
          sku: values.sku,
          name: values.name,
          ...(values.description ? { description: values.description } : {}),
          ...(values.category ? { category: values.category } : {}),
          price: Math.round(values.priceEuros * 100),
          ...(values.costEuros != null ? { cost: Math.round(values.costEuros * 100) } : {}),
          currency: 'EUR',
          stock: values.stock ?? 0,
          lowStockThreshold: values.lowStockThreshold ?? 0,
          supplierId: values.supplierId || null,
          ...(values.imageUrl ? { imageUrl: values.imageUrl } : {}),
          active: values.active ?? true,
          isStoreItem: values.isStoreItem ?? false,
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText<ProductFormValues> name="sku" label="SKU" required placeholder="ESM-ROJO-01" />
        <FieldText<ProductFormValues> name="name" label="Nombre" required placeholder="Esmalte semipermanente rojo" />
      </div>

      <FieldTextarea<ProductFormValues>
        name="description"
        label="Descripción"
        placeholder="Bote de 15ml, acabado brillante."
        rows={3}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldText<ProductFormValues> name="category" label="Categoría" placeholder="Esmaltes" />
        <FieldSelect<ProductFormValues>
          name="supplierId"
          label="Proveedor"
          options={supplierOptions}
          disabled={suppliersQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldNumber<ProductFormValues> name="priceEuros" label="Precio de venta" required min={0} step={0.01} suffix="€" />
        <FieldNumber<ProductFormValues> name="costEuros" label="Coste" min={0} step={0.01} suffix="€" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldNumber<ProductFormValues> name="stock" label="Stock inicial" min={0} step={1} suffix="uds." />
        <FieldNumber<ProductFormValues> name="lowStockThreshold" label="Umbral de stock bajo" min={0} step={1} suffix="uds." />
      </div>

      <FieldImageUpload<ProductFormValues> name="imageUrl" label="Foto del producto" aspect="video" />

      <div className="flex flex-wrap gap-6">
        <CheckboxField<ProductFormValues> name="active" label="Producto activo" />
        <CheckboxField<ProductFormValues> name="isStoreItem" label="Visible en tienda online" />
      </div>
    </FormDialog>
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
