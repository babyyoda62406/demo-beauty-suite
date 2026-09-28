'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { LifeBuoy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@/components/ui';
import {
  ConfirmDialog,
  DataTable,
  StatusBadge,
  Toolbar,
  getErrorMessage,
  type DataTablePagination,
  type StatusConfig,
} from '@/components/common';
import { formatDateTime } from '@/lib/format';
import {
  useCreateTicket,
  useDeleteTicket,
  useTenants,
  useTickets,
  useUpdateTicket,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type CreateTicketInput,
  type SupportTicket,
  type TicketPriority,
  type TicketStatus,
  type UpdateTicketInput,
} from '@/lib/hooks/superadmin';
import { TicketFormDialog } from './ticket-form-dialog';

const PAGE_SIZE = 20;

const STATUS_OVERRIDES: Record<string, StatusConfig> = {
  open: { label: TICKET_STATUS_LABELS.OPEN, variant: 'warning' },
  in_progress: { label: TICKET_STATUS_LABELS.IN_PROGRESS, variant: 'brand' },
  resolved: { label: TICKET_STATUS_LABELS.RESOLVED, variant: 'success' },
  closed: { label: TICKET_STATUS_LABELS.CLOSED, variant: 'neutral' },
};

const PRIORITY_VARIANT: Record<TicketPriority, 'neutral' | 'warning' | 'danger' | 'brand'> = {
  LOW: 'neutral',
  MEDIUM: 'brand',
  HIGH: 'warning',
  URGENT: 'danger',
};

/** Listado de incidencias de soporte de todos los salones (SPEC §7). */
export function TicketsTable(): React.JSX.Element {
  const { toast } = useToast();

  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<string>('');
  const [priority, setPriority] = React.useState<string>('');

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SupportTicket | undefined>(undefined);
  const [deleting, setDeleting] = React.useState<SupportTicket | undefined>(undefined);

  const query = useTickets({
    page,
    pageSize: PAGE_SIZE,
    ...(status ? { status: status as TicketStatus } : {}),
    ...(priority ? { priority: priority as TicketPriority } : {}),
  });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  // Salones para el selector del alta y para mostrar el nombre en la tabla.
  const tenantsQuery = useTenants({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' });
  const tenantName = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tenantsQuery.data?.data ?? []) map.set(t.id, t.name);
    return map;
  }, [tenantsQuery.data]);
  const tenantOptions = React.useMemo(
    () => (tenantsQuery.data?.data ?? []).map((t) => ({ value: t.id, label: t.name })),
    [tenantsQuery.data],
  );

  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (ticket: SupportTicket): void => {
    setEditing(ticket);
    setFormOpen(true);
  };

  const handleCreate = async (values: CreateTicketInput): Promise<void> => {
    await createTicket.mutateAsync(values);
    toast({ variant: 'success', title: 'Incidencia abierta', description: values.subject });
  };
  const handleUpdate = async (id: string, values: UpdateTicketInput): Promise<void> => {
    await updateTicket.mutateAsync({ id, data: values });
    toast({ variant: 'success', title: 'Incidencia actualizada' });
  };
  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deleteTicket.mutateAsync(deleting.id);
      toast({ variant: 'success', title: 'Incidencia eliminada' });
    } catch (error) {
      toast({ variant: 'danger', title: 'No se pudo eliminar', description: getErrorMessage(error) });
    } finally {
      setDeleting(undefined);
    }
  };

  const columns = React.useMemo<ColumnDef<SupportTicket, unknown>[]>(
    () => [
      {
        id: 'subject',
        header: 'Incidencia',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.subject}</p>
            <p className="truncate text-xs text-ink-soft/70">
              {tenantName.get(row.original.tenantId) ?? row.original.tenantId}
            </p>
          </div>
        ),
      },
      {
        id: 'priority',
        header: 'Prioridad',
        cell: ({ row }) => (
          <Badge variant={PRIORITY_VARIANT[row.original.priority]}>
            {TICKET_PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge status={row.original.status} overrides={STATUS_OVERRIDES} />,
      },
      {
        id: 'createdAt',
        header: 'Creada',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="text-ink-soft">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Acciones de la incidencia">
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openEdit(row.original)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setDeleting(row.original)}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [tenantName],
  );

  const pagination: DataTablePagination | undefined = meta
    ? {
        page: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
        totalPages: meta.totalPages,
        onPageChange: setPage,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Estado"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Todos los estados' },
              ...Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Prioridad"
            value={priority}
            onChange={(v) => {
              setPriority(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Todas las prioridades' },
              ...Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva incidencia
        </Button>
      </Toolbar>

      <DataTable<SupportTicket>
        columns={columns}
        data={rows}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        getRowId={(row) => row.id}
        {...(pagination ? { pagination } : {})}
        emptyIcon={LifeBuoy}
        emptyTitle="Sin incidencias"
        emptyDescription="No hay incidencias que coincidan con los filtros."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Abrir incidencia
          </Button>
        }
      />

      <TicketFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        onOpenChange={setFormOpen}
        ticket={editing}
        tenantOptions={tenantOptions}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title="Eliminar incidencia"
        confirmLabel="Eliminar"
        description={deleting ? `¿Eliminar la incidencia "${deleting.subject}"?` : undefined}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** Select nativo de filtro con estética de marca. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}): React.JSX.Element {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-brand-100 bg-white px-3 pr-9 text-sm text-ink shadow-sm transition-colors focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
