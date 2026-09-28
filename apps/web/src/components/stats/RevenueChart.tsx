'use client';

import * as React from 'react';
import { parseISO } from 'date-fns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChartCard, ErrorState } from '@/components/common';
import { formatMoneyCompact } from '@/lib/format';
import {
  useStatsRevenue,
  type RevenueGranularity,
  type StatsRangeParams,
} from '@/lib/hooks/stats';
import { SegmentedControl } from './SegmentedControl';

export interface RevenueChartProps {
  range: StatsRangeParams;
}

const GRANULARITY_OPTIONS: { value: RevenueGranularity; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

/** Convierte la clave de bucket de la API en una etiqueta legible es-ES. */
function bucketLabel(key: string, granularity: RevenueGranularity): string {
  const date = granularity === 'month' ? parseISO(`${key}-01`) : parseISO(key);
  if (Number.isNaN(date.getTime())) return key;
  if (granularity === 'month') return format(date, 'MMM yy', { locale: es });
  return format(date, 'd MMM', { locale: es });
}

/**
 * Serie temporal de facturación con selector de granularidad (día/semana/mes).
 * Los importes llegan en céntimos y se formatean a € en eje y tooltip.
 */
export function RevenueChart({ range }: RevenueChartProps): React.JSX.Element {
  const [granularity, setGranularity] = React.useState<RevenueGranularity>('day');
  const { data, isLoading, error, refetch } = useStatsRevenue({ ...range, granularity });

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const currency = data?.currency ?? 'EUR';
  const chartData = (data?.series ?? []).map((point) => ({
    label: bucketLabel(point.label, granularity),
    revenue: point.value,
  }));
  const hasRevenue = chartData.some((point) => point.revenue > 0);

  return (
    <LineChartCard
      title="Facturación por periodo"
      description="Total cobrado en cada intervalo."
      loading={isLoading}
      empty={!isLoading && !hasRevenue}
      emptyMessage="No se registraron cobros en el periodo seleccionado."
      data={chartData}
      categoryKey="label"
      series={[{ dataKey: 'revenue', name: 'Facturación' }]}
      valueFormatter={(value) => formatMoneyCompact(value, currency)}
      actions={
        <SegmentedControl
          ariaLabel="Granularidad de la serie"
          size="sm"
          value={granularity}
          onChange={setGranularity}
          options={GRANULARITY_OPTIONS}
        />
      }
    />
  );
}
