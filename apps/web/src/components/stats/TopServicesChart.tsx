'use client';

import * as React from 'react';
import { DonutChartCard, ErrorState } from '@/components/common';
import { formatMoneyCompact, formatNumber } from '@/lib/format';
import { useTopServices, type StatsRangeParams } from '@/lib/hooks/stats';
import { SegmentedControl } from './SegmentedControl';

export interface TopServicesChartProps {
  range: StatsRangeParams;
}

type ServiceMetric = 'bookings' | 'revenue';

const METRIC_OPTIONS: { value: ServiceMetric; label: string }[] = [
  { value: 'bookings', label: 'Citas' },
  { value: 'revenue', label: 'Ingresos' },
];

/** Divisa por defecto (los servicios no exponen `currency` en este endpoint). */
const CURRENCY = 'EUR';

/**
 * Servicios más vendidos del periodo (tarta/donut), alternando entre nº de
 * citas e ingresos generados.
 */
export function TopServicesChart({ range }: TopServicesChartProps): React.JSX.Element {
  const [metric, setMetric] = React.useState<ServiceMetric>('bookings');
  const { data, isLoading, error, refetch } = useTopServices({ ...range, limit: 8 });

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const chartData = (data ?? []).map((service) => ({
    name: service.label,
    value: metric === 'bookings' ? service.value : service.revenue,
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <DonutChartCard
      title="Servicios más vendidos"
      description="Ranking del periodo por citas o ingresos."
      loading={isLoading}
      empty={!isLoading && total === 0}
      emptyMessage="No hay servicios reservados en el periodo."
      data={chartData}
      valueFormatter={(value) =>
        metric === 'revenue' ? formatMoneyCompact(value, CURRENCY) : formatNumber(value)
      }
      actions={
        <SegmentedControl
          ariaLabel="Métrica de servicios"
          size="sm"
          value={metric}
          onChange={setMetric}
          options={METRIC_OPTIONS}
        />
      }
    />
  );
}
