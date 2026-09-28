'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Mail, Pencil, Phone, Trash2, Truck } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { Toolbar, SearchInput, DataTable, ConfirmDialog, getErrorMessage } from '@/components/common';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  type Supplier,
} from '@/lib/hooks/inventory';
import { SupplierFormDialog } from './SupplierFormDialog';

/** Pestaña Proveedores: CRUD sobre /suppliers. */
export function SuppliersTab(): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Supplier | undefined>(undefined);

  const query = useSuppliers({ page, pageSize, ...(search ? { search } : {}), sortBy: 'name', sortOrder: 'asc' });
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (supplier: Supplier): void => {
    setEditing(supplier);
    setFormOpen(true);
  };

  const columns = React.useMemo<ColumnDef<Supplier, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Proveedor',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.name}</p>
            {row.original.contact ? (
              <p className="truncate text-xs text-ink-soft/70">{row.original.contact}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) =>
          row.original.email ? (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <Mail className="size-3.5 text-brand-400" aria-hidden="true" />
              {row.original.email}
            </span>
          ) : (
            <span className="text-ink-soft/40">—</span>
          ),
      },
      {
        id: 'phone',
        header: 'Teléfono',
        cell: ({ row }) =>
          row.original.phone ? (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <Phone className="size-3.5 text-brand-400" aria-hidden="true" />
              {row.original.phone}
            </span>
          ) : (
            <span className="text-ink-soft/40">—</span>
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
        start={<SearchInput onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por nombre, contacto o email…" />}
        end={
          <Button onClick={openCreate}>
            <Truck className="size-4" aria-hidden="true" />
            Nuevo proveedor
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        emptyIcon={Truck}
        emptyTitle="Sin proveedores"
        emptyDescription="Registra tus proveedores para asociarlos a los productos."
        emptyAction={<Button onClick={openCreate}>Nuevo proveedor</Button>}
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

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editing}
        onSubmit={async (values) => {
          if (editing) {
            await updateSupplier.mutateAsync({ id: editing.id, ...values });
            toast({ title: 'Proveedor actualizado', variant: 'success' });
          } else {
            await createSupplier.mutateAsync(values);
            toast({ title: 'Proveedor creado', variant: 'success' });
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Eliminar proveedor"
        description={
          deleteTarget ? `¿Seguro que quieres eliminar «${deleteTarget.name}»? Esta acción no se puede deshacer.` : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteSupplier.mutateAsync({ id: deleteTarget.id });
            toast({ title: 'Proveedor eliminado', variant: 'success' });
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
