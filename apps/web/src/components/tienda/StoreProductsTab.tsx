'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PackagePlus, Pencil, ShoppingBag, Trash2 } from 'lucide-react';
import { Badge, Button, toast } from '@/components/ui';
import { Toolbar, SearchInput, DataTable, MoneyCell, ConfirmDialog, getErrorMessage } from '@/components/common';
import { ProductFormDialog } from '@/components/inventario';
import {
  useStoreProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
} from '@/lib/hooks/store';

/**
 * Pestaña Productos de tienda: catálogo de `Product` con `isStoreItem: true`,
 * visible en la tienda online del cliente. Reutiliza el alta/edición de
 * Inventario (marca automáticamente el producto como visible en tienda).
 */
export function StoreProductsTab(): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | undefined>(undefined);

  const query = useStoreProducts({ page, pageSize, ...(search ? { search } : {}), sortBy: 'name', sortOrder: 'asc' });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (product: Product): void => {
    setEditing(product);
    setFormOpen(true);
  };

  const columns = React.useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="font-mono text-xs text-ink-soft">{row.original.sku}</span>,
      },
      {
        accessorKey: 'name',
        header: 'Producto',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.name}</p>
            {row.original.category ? (
              <p className="truncate text-xs text-ink-soft/70">{row.original.category}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Precio',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.price} currency={row.original.currency} />,
      },
      {
        accessorKey: 'stock',
        header: 'Stock',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const low = row.original.stock <= row.original.lowStockThreshold;
          return (
            <Badge variant={low ? 'warning' : 'success'} className="tabular-nums">
              {row.original.stock}
            </Badge>
          );
        },
      },
      {
        id: 'active',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${row.original.name}`}
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Quitar ${row.original.name} de la tienda`}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-4 text-danger" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      <Toolbar
        start={<SearchInput onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por SKU, nombre o categoría…" />}
        end={
          <Button onClick={openCreate}>
            <PackagePlus className="size-4" aria-hidden="true" />
            Nuevo producto de tienda
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        emptyIcon={ShoppingBag}
        emptyTitle="Sin productos en la tienda"
        emptyDescription="Marca productos del inventario como visibles en la tienda online para que aparezcan aquí."
        emptyAction={<Button onClick={openCreate}>Nuevo producto de tienda</Button>}
        {...(meta
          ? {
              pagination: {
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                totalPages: meta.totalPages,
                onPageChange: setPage,
              },
            }
          : {})}
      />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSubmit={async (values) => {
          if (editing) {
            await updateProduct.mutateAsync({ id: editing.id, ...values, isStoreItem: true });
            toast({ title: 'Producto actualizado', variant: 'success' });
          } else {
            await createProduct.mutateAsync({ ...values, isStoreItem: true });
            toast({ title: 'Producto creado', variant: 'success' });
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Eliminar producto de tienda"
        description={
          deleteTarget ? `¿Seguro que quieres eliminar «${deleteTarget.name}»? Esta acción no se puede deshacer.` : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteProduct.mutateAsync({ id: deleteTarget.id });
            toast({ title: 'Producto eliminado', variant: 'success' });
          } catch (error) {
            toast({ title: 'No se pudo eliminar', description: getErrorMessage(error), variant: 'danger' });
          } finally {
            setDeleteTarget(undefined);
          }
        }}
      />
    </div>
  );
}
