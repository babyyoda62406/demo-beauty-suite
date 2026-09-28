'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, toast } from '@/components/ui';
import { Toolbar, SearchInput, DataTable, ConfirmDialog, getErrorMessage } from '@/components/common';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  type Employee,
} from '@/lib/hooks/employees';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { EmployeeDetailDrawer } from './EmployeeDetailDrawer';
import { mediaUrl } from '@/lib/media';

/** DataTable de profesionales: foto, título, color, reservable y comisión. Alta/edición + ficha con Tabs. */
export function EmployeesTable(): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Employee | undefined>(undefined);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const query = useEmployees({ page, pageSize, ...(search ? { search } : {}), sortBy: 'name', sortOrder: 'asc' });
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (employee: Employee): void => {
    setEditing(employee);
    setFormOpen(true);
  };

  const columns = React.useMemo<ColumnDef<Employee, unknown>[]>(
    () => [
      {
        id: 'foto',
        header: '',
        cell: ({ row }) => {
          const e = row.original;
          const initials = e.name
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
          return (
            <Avatar className="size-10 border-2" style={{ borderColor: e.color }}>
              <AvatarImage src={e.photoUrl ? mediaUrl(e.photoUrl) : undefined} alt={e.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          );
        },
      },
      {
        accessorKey: 'name',
        header: 'Profesional',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.name}</p>
            {row.original.title ? (
              <p className="truncate text-xs text-ink-soft/70">{row.original.title}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'color',
        header: 'Color',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span
            className="mx-auto block size-5 rounded-full border border-brand-100 shadow-sm"
            style={{ backgroundColor: row.original.color }}
            aria-hidden="true"
          />
        ),
      },
      {
        id: 'bookable',
        header: 'Reservable',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Badge variant={row.original.bookable ? 'brand' : 'neutral'}>
            {row.original.bookable ? 'Sí' : 'No'}
          </Badge>
        ),
      },
      {
        id: 'active',
        header: 'Estado',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        id: 'commissionRate',
        header: 'Comisión',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-ink-soft">
            {row.original.commissionRate != null ? `${(row.original.commissionRate / 100).toFixed(0)}%` : '—'}
          </span>
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
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row.original);
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${row.original.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.original);
              }}
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
        start={
          <SearchInput
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Buscar por nombre, teléfono o email…"
          />
        }
        end={
          <Button onClick={openCreate}>
            <UserPlus className="size-4" aria-hidden="true" />
            Nuevo profesional
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        onRowClick={(row) => setDetailId(row.id)}
        emptyIcon={Users}
        emptyTitle="Sin profesionales"
        emptyDescription="Añade tu primer profesional para empezar a gestionar el equipo."
        emptyAction={<Button onClick={openCreate}>Nuevo profesional</Button>}
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

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editing}
        onSubmit={async (values) => {
          if (editing) {
            await updateEmployee.mutateAsync({ id: editing.id, data: values });
            toast({ title: 'Profesional actualizado', variant: 'success' });
          } else {
            await createEmployee.mutateAsync(values);
            toast({ title: 'Profesional creado', variant: 'success' });
          }
        }}
      />

      <EmployeeDetailDrawer employeeId={detailId} onOpenChange={(open) => !open && setDetailId(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Eliminar profesional"
        description={
          deleteTarget
            ? `¿Seguro que quieres eliminar a «${deleteTarget.name}»? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteEmployee.mutateAsync(deleteTarget.id);
            toast({ title: 'Profesional eliminado', variant: 'success' });
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
