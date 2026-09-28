'use client';

import * as React from 'react';
import { DonutChartCard, ErrorState, CHART_COLORS } from '@/components/common';
import { formatNumber } from '@/lib/format';
import { useStatsOverview, type StatsRangeParams } from '@/lib/hooks/stats';

export interface ClientsChartProps {
  range: StatsRangeParams;
}

/**
 * Reparto de clientas nuevas vs. recurrentes del periodo (tarta/donut).
 * Reutiliza la caché de `useStatsOverview` (misma clave que los KPIs).
 */
export function ClientsChart({ range }: ClientsChartProps): React.JSX.Element {
  const { data, isLoading, error, refetch } = useStatsOverview(range);

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const chartData = data
    ? [
        { name: 'Nuevas', value: data.newClients, color: CHART_COLORS[0] },
        { name: 'Recurrentes', value: data.recurringClients, color: CHART_COLORS[2] },
      ]
    : [];
  const total = data ? data.newClients + data.recurringClients : 0;

  return (
    <DonutChartCard
      title="Clientas nuevas vs. recurrentes"
      description="Distribución de clientas atendidas en el periodo."
      loading={isLoading}
      empty={!isLoading && total === 0}
      emptyMessage="Aún no hay clientas atendidas en el periodo."
      data={chartData}
      valueFormatter={(value) => formatNumber(value)}
    />
  );
}
