'use client';

import * as React from 'react';
import { Building2, CalendarCheck, LifeBuoy, Users, Wallet } from 'lucide-react';
import {
  BarChartCard,
  DonutChartCard,
  MoneyText,
  StatCard,
  StatGrid,
  type DonutDatum,
} from '@/components/common';
import {
  useGlobalStats,
  useTenants,
  PLAN_LABELS,
  TENANT_STATUS_LABELS,
  type PlanKey,
} from '@/lib/hooks/superadmin';
import { formatNumber } from '@/lib/format';

/** Panel de estadísticas globales de la plataforma con KPIs y gráficas (SPEC §7). */
export function PlatformStats(): React.JSX.Element {
  const statsQuery = useGlobalStats();
  const stats = statsQuery.data;

  // Todos los salones (hasta 100) para la distribución por plan.
  const tenantsQuery = useTenants({ page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' });

  const statusData: DonutDatum[] = React.useMemo(() => {
    if (!stats) return [];
    return [
      { name: TENANT_STATUS_LABELS.ACTIVE, value: stats.tenants.active },
      { name: TENANT_STATUS_LABELS.TRIAL, value: stats.tenants.trial },
      { name: TENANT_STATUS_LABELS.SUSPENDED, value: stats.tenants.suspended },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const planData = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tenantsQuery.data?.data ?? []) {
      counts.set(String(t.planKey), (counts.get(String(t.planKey)) ?? 0) + 1);
    }
    return (Object.keys(PLAN_LABELS) as PlanKey[]).map((k) => ({
      plan: PLAN_LABELS[k],
      salones: counts.get(k) ?? 0,
    }));
  }, [tenantsQuery.data]);

  const kpiLoading = statsQuery.isLoading;

  return (
    <div className="space-y-6">
      <StatGrid columns={4}>
        <StatCard
          label="Salones"
          icon={Building2}
          loading={kpiLoading}
          value={formatNumber(stats?.tenants.total ?? 0)}
          {...(stats
            ? { hint: `${stats.tenants.active} activos · ${stats.tenants.trial} en prueba` }
            : {})}
        />
        <StatCard
          label="MRR aproximado"
          icon={Wallet}
          loading={kpiLoading}
          value={<MoneyText cents={stats?.mrrCents ?? 0} currency={stats?.currency ?? 'EUR'} />}
          hint="Suscripciones activas"
        />
        <StatCard
          label="Citas totales"
          icon={CalendarCheck}
          loading={kpiLoading}
          value={formatNumber(stats?.bookingsTotal ?? 0)}
          hint="En toda la plataforma"
        />
        <StatCard
          label="Incidencias abiertas"
          icon={LifeBuoy}
          loading={kpiLoading}
          value={formatNumber(stats?.openTickets ?? 0)}
        />
      </StatGrid>

      <StatGrid columns={2}>
        <StatCard
          label="Clientas totales"
          icon={Users}
          loading={kpiLoading}
          value={formatNumber(stats?.clientsTotal ?? 0)}
          hint="Registradas en todos los salones"
        />
        <StatCard
          label="Salones suspendidos"
          icon={Building2}
          loading={kpiLoading}
          value={formatNumber(stats?.tenants.suspended ?? 0)}
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChartCard
          title="Salones por estado"
          description="Distribución del estado de los salones."
          loading={statsQuery.isLoading}
          data={statusData}
          valueFormatter={(v) => formatNumber(v)}
        />
        <BarChartCard
          title="Salones por plan"
          description="Nº de salones en cada plan."
          loading={tenantsQuery.isLoading}
          data={planData}
          categoryKey="plan"
          series={[{ dataKey: 'salones', name: 'Salones' }]}
          valueFormatter={(v) => formatNumber(v)}
        />
      </div>
    </div>
  );
}
