'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Boxes, PackagePlus, Pencil, Sliders, Trash2 } from 'lucide-react';
import { Badge, Button, toast } from '@/components/ui';
import {
  Toolbar,
  SearchInput,
  DataTable,
  MoneyCell,
  ConfirmDialog,
  getErrorMessage,
} from '@/components/common';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateStockMovement,
  type Product,
} from '@/lib/hooks/inventory';
import { ProductFormDialog } from './ProductFormDialog';
import { StockMovementDialog } from './StockMovementDialog';

export interface ProductsTabProps {
  /** Id de producto a resaltar/abrir tras venir del aviso de stock bajo. */
  focusProductId?: string | null;
}

/** Pestaña Productos: tabla con alta/edición y ajuste de stock (IN/OUT/ADJUST). */
export function ProductsTab({ focusProductId }: ProductsTabProps): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | undefined>(undefined);
  const [stockOpen, setStockOpen] = React.useState(false);
  const [stockTarget, setStockTarget] = React.useState<Product | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | undefined>(undefined);

  const query = useProducts({ page, pageSize, ...(search ? { search } : {}), sortBy: 'name', sortOrder: 'asc' });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createStockMovement = useCreateStockMovement();

  React.useEffect(() => {
    if (!focusProductId || !query.data) return;
    const found = query.data.data.find((p) => p.id === focusProductId);
    if (found) setStockTarget(found);
  }, [focusProductId, query.data]);

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (product: Product): void => {
    setEditing(product);
    setFormOpen(true);
  };
  const openStock = (product: Product): void => {
    setStockTarget(product);
    setStockOpen(true);
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
        accessorKey: 'cost',
        header: 'Coste',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.cost} currency={row.original.currency} />,
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
        accessorKey: 'lowStockThreshold',
        header: 'Umbral',
        meta: { align: 'center' },
        cell: ({ row }) => <span className="tabular-nums text-ink-soft">{row.original.lowStockThreshold}</span>,
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
              aria-label={`Ajustar stock de ${row.original.name}`}
              onClick={() => openStock(row.original)}
            >
              <Sliders className="size-4" aria-hidden="true" />
            </Button>
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
              aria-label={`Eliminar ${row.original.name}`}
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
            Nuevo producto
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        emptyIcon={Boxes}
        emptyTitle="Sin productos"
        emptyDescription="Añade tu primer producto para empezar a controlar el inventario."
        emptyAction={<Button onClick={openCreate}>Nuevo producto</Button>}
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
            await updateProduct.mutateAsync({ id: editing.id, ...values });
            toast({ title: 'Producto actualizado', variant: 'success' });
          } else {
            await createProduct.mutateAsync(values);
            toast({ title: 'Producto creado', variant: 'success' });
          }
        }}
      />

      <StockMovementDialog
        open={stockOpen}
        onOpenChange={(open) => {
          setStockOpen(open);
          if (!open) setStockTarget(undefined);
        }}
        product={stockTarget}
        onSubmit={async (values) => {
          if (!stockTarget) return;
          await createStockMovement.mutateAsync({ productId: stockTarget.id, ...values });
          toast({ title: 'Movimiento de stock registrado', variant: 'success' });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Eliminar producto"
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
