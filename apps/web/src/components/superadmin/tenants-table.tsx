'use client';

import * as React from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  Building2,
  CalendarClock,
  LogIn,
  MoreHorizontal,
  Plus,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from '@/components/ui';
import {
  ConfirmDialog,
  DataTable,
  getErrorMessage,
  SearchInput,
  StatusBadge,
  Toolbar,
  type DataTablePagination,
  type StatusConfig,
} from '@/components/common';
import { formatDate } from '@/lib/format';
import {
  useCreateTenant,
  useImpersonate,
  useTenants,
  PLAN_LABELS,
  TENANT_STATUS_LABELS,
  type CreateTenantInput,
  type PlanKey,
  type TenantMetrics,
} from '@/lib/hooks/superadmin';
import { TenantFormDialog } from './tenant-form-dialog';

const PAGE_SIZE = 20;

/** Estados de salón → color de badge. */
const TENANT_STATUS_OVERRIDES: Record<string, StatusConfig> = {
  active: { label: TENANT_STATUS_LABELS.ACTIVE, variant: 'success' },
  trial: { label: TENANT_STATUS_LABELS.TRIAL, variant: 'warning' },
  suspended: { label: TENANT_STATUS_LABELS.SUSPENDED, variant: 'danger' },
  cancelled: { label: TENANT_STATUS_LABELS.CANCELLED, variant: 'neutral' },
};

function sortParams(sorting: SortingState): { sortBy?: string; sortOrder?: 'asc' | 'desc' } {
  const first = sorting[0];
  if (!first) return {};
  return { sortBy: first.id, sortOrder: first.desc ? 'desc' : 'asc' };
}

/**
 * Superficie principal del Super Admin: listado de salones con métricas,
 * búsqueda, filtros por estado/plan, alta de salón y acción de impersonar
 * (entrar como salón para dar soporte) — SPEC §7.
 */
export function TenantsTable(): React.JSX.Element {
  const { toast } = useToast();

  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<string>('');
  const [planKey, setPlanKey] = React.useState<string>('');
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [impersonating, setImpersonating] = React.useState<TenantMetrics | undefined>(undefined);

  const query = useTenants({
    page,
    pageSize: PAGE_SIZE,
    search,
    ...(status ? { status: status as TenantMetrics['status'] } : {}),
    ...(planKey ? { planKey: planKey as PlanKey } : {}),
    ...sortParams(sorting),
  });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  const createTenant = useCreateTenant();
  const impersonate = useImpersonate();

  const handleSearch = React.useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleCreate = async (values: CreateTenantInput): Promise<void> => {
    const created = await createTenant.mutateAsync(values);
    toast({ variant: 'success', title: 'Salón creado', description: created.name ?? values.name });
  };

  const handleImpersonate = async (): Promise<void> => {
    if (!impersonating) return;
    try {
      const token = await impersonate.mutateAsync({ tenantId: impersonating.id });
      const minutes = Math.round((token.expiresIn ?? 0) / 60);
      toast({
        variant: 'success',
        title: 'Sesión de soporte iniciada',
        description: `Token emitido para ${impersonating.name}${
          minutes ? ` · válido ${minutes} min` : ''
        }.`,
      });
    } catch (error) {
      toast({
        variant: 'danger',
        title: 'No se pudo impersonar',
        description: getErrorMessage(error),
      });
    } finally {
      setImpersonating(undefined);
    }
  };

  const columns = React.useMemo<ColumnDef<TenantMetrics, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Salón',
        enableSorting: true,
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{t.name}</p>
                <p className="truncate text-xs text-ink-soft/70">/{t.slug}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'planKey',
        header: 'Plan',
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant="outline">
            {PLAN_LABELS[row.original.planKey as PlanKey] ?? row.original.planKey}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        enableSorting: true,
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} overrides={TENANT_STATUS_OVERRIDES} />
        ),
      },
      {
        id: 'clients',
        header: 'Clientas',
        enableSorting: false,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-ink-soft">{row.original.metrics.clients}</span>
        ),
      },
      {
        id: 'bookings',
        header: 'Citas',
        enableSorting: false,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-ink-soft">{row.original.metrics.bookings}</span>
        ),
      },
      {
        id: 'users',
        header: 'Usuarios',
        enableSorting: false,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums text-ink-soft">
            <Users className="size-3.5 text-ink-soft/50" aria-hidden="true" />
            {row.original.metrics.users}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Alta',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-ink-soft">
            <CalendarClock className="size-3.5 text-brand-400" aria-hidden="true" />
            {formatDate(row.original.createdAt, 'd MMM yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Acciones de ${t.name}`}>
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setImpersonating(t)}>
                    <LogIn className="size-4" aria-hidden="true" />
                    Entrar como salón
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [],
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
        <SearchInput
          placeholder="Buscar salón por nombre o slug…"
          onSearch={handleSearch}
          className="w-full sm:max-w-xs"
        />
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
              ...Object.entries(TENANT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Plan"
            value={planKey}
            onChange={(v) => {
              setPlanKey(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Todos los planes' },
              ...Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo salón
          </Button>
        </div>
      </Toolbar>

      <DataTable<TenantMetrics>
        columns={columns}
        data={rows}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        {...(pagination ? { pagination } : {})}
        getRowId={(row) => row.id}
        emptyIcon={Building2}
        emptyTitle="Sin salones"
        emptyDescription="Aún no hay salones que coincidan con los filtros."
        emptyAction={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Crear el primer salón
          </Button>
        }
      />

      <TenantFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} />

      <ConfirmDialog
        open={impersonating !== undefined}
        onOpenChange={(next) => !next && setImpersonating(undefined)}
        title="Entrar como salón"
        variant="primary"
        confirmLabel="Iniciar sesión de soporte"
        description={
          impersonating
            ? `Se emitirá un token de soporte acotado a "${impersonating.name}". Esta acción queda registrada en la auditoría.`
            : undefined
        }
        onConfirm={handleImpersonate}
      />
    </div>
  );
}

/** Select nativo de filtro, alineado a la estética de marca. */
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
    <label className="sr-only-label relative">
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
