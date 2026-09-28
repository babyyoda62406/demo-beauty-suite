'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, CreditCard, Layers, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui';
import {
  DataTable,
  MoneyText,
  StatCard,
  StatGrid,
  StatusBadge,
  type StatusConfig,
} from '@/components/common';
import {
  useGlobalStats,
  usePlans,
  useTenants,
  PLAN_LABELS,
  TENANT_STATUS_LABELS,
  type PlanKey,
  type TenantMetrics,
} from '@/lib/hooks/superadmin';

const PAGE_SIZE = 50;

const TENANT_STATUS_OVERRIDES: Record<string, StatusConfig> = {
  active: { label: TENANT_STATUS_LABELS.ACTIVE, variant: 'success' },
  trial: { label: TENANT_STATUS_LABELS.TRIAL, variant: 'warning' },
  suspended: { label: TENANT_STATUS_LABELS.SUSPENDED, variant: 'danger' },
  cancelled: { label: TENANT_STATUS_LABELS.CANCELLED, variant: 'neutral' },
};

interface SubscriptionRow extends TenantMetrics {
  planName: string;
  priceMonthly: number;
  planCurrency: string;
}

/**
 * Suscripciones por salón. La API no expone un listado de suscripciones entre
 * salones, así que se compone a partir de los salones (plan y suscripciones
 * activas) cruzados con el catálogo de planes para el importe mensual.
 */
export function SubscriptionsTable(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const tenantsQuery = useTenants({ page, pageSize: PAGE_SIZE, sortBy: 'createdAt', sortOrder: 'desc' });
  const plansQuery = usePlans();
  const statsQuery = useGlobalStats();

  const priceByKey = React.useMemo(() => {
    const map = new Map<string, { price: number; currency: string; name: string }>();
    for (const p of plansQuery.data ?? []) {
      map.set(p.key, { price: p.priceMonthly, currency: p.currency, name: p.name });
    }
    return map;
  }, [plansQuery.data]);

  const rows: SubscriptionRow[] = React.useMemo(
    () =>
      (tenantsQuery.data?.data ?? []).map((t) => {
        const plan = priceByKey.get(String(t.planKey));
        return {
          ...t,
          planName: plan?.name ?? PLAN_LABELS[t.planKey as PlanKey] ?? String(t.planKey),
          priceMonthly: plan?.price ?? 0,
          planCurrency: plan?.currency ?? t.currency,
        };
      }),
    [tenantsQuery.data, priceByKey],
  );

  const meta = tenantsQuery.data?.meta;
  const stats = statsQuery.data;
  const activeSubs = rows.reduce((acc, r) => acc + r.metrics.activeSubscriptions, 0);

  const columns = React.useMemo<ColumnDef<SubscriptionRow, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Salón',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <Building2 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{row.original.name}</p>
              <p className="truncate text-xs text-ink-soft/70">/{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'plan',
        header: 'Plan',
        cell: ({ row }) => <Badge variant="outline">{row.original.planName}</Badge>,
      },
      {
        id: 'price',
        header: 'Precio/mes',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <MoneyText cents={row.original.priceMonthly} currency={row.original.planCurrency} />
        ),
      },
      {
        id: 'activeSubscriptions',
        header: 'Suscripciones activas',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const n = row.original.metrics.activeSubscriptions;
          return n > 0 ? (
            <Badge variant="success" className="tabular-nums">
              {n}
            </Badge>
          ) : (
            <span className="text-ink-soft/40">—</span>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado del salón',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} overrides={TENANT_STATUS_OVERRIDES} />
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <StatGrid columns={3}>
        <StatCard
          label="MRR aproximado"
          icon={Wallet}
          loading={statsQuery.isLoading}
          value={<MoneyText cents={stats?.mrrCents ?? 0} currency={stats?.currency ?? 'EUR'} />}
          hint="Sobre suscripciones activas"
        />
        <StatCard
          label="Suscripciones activas"
          icon={CreditCard}
          loading={tenantsQuery.isLoading}
          value={activeSubs}
          hint="En los salones mostrados"
        />
        <StatCard
          label="Planes disponibles"
          icon={Layers}
          loading={plansQuery.isLoading}
          value={plansQuery.data?.length ?? 0}
        />
      </StatGrid>

      <DataTable<SubscriptionRow>
        columns={columns}
        data={rows}
        loading={tenantsQuery.isLoading}
        error={tenantsQuery.isError ? tenantsQuery.error : undefined}
        onRetry={() => void tenantsQuery.refetch()}
        getRowId={(row) => row.id}
        emptyIcon={CreditCard}
        emptyTitle="Sin suscripciones"
        emptyDescription="Aún no hay salones con suscripción."
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
    </div>
  );
}
