'use client';

import * as React from 'react';
import { BarChartCard, ErrorState } from '@/components/common';
import { formatMoneyCompact, formatNumber } from '@/lib/format';
import { useEmployeeStats, type StatsRangeParams } from '@/lib/hooks/stats';
import { SegmentedControl } from './SegmentedControl';

export interface EmployeesChartProps {
  range: StatsRangeParams;
}

type EmployeeMetric = 'revenue' | 'bookings';

const METRIC_OPTIONS: { value: EmployeeMetric; label: string }[] = [
  { value: 'revenue', label: 'Ingresos' },
  { value: 'bookings', label: 'Citas' },
];

const CURRENCY = 'EUR';

/**
 * Productividad por empleada (barras): facturación gestionada o nº de citas
 * atendidas en el periodo.
 */
export function EmployeesChart({ range }: EmployeesChartProps): React.JSX.Element {
  const [metric, setMetric] = React.useState<EmployeeMetric>('revenue');
  const { data, isLoading, error, refetch } = useEmployeeStats(range);

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const chartData = (data ?? []).map((employee) => ({
    label: employee.label,
    value: metric === 'revenue' ? employee.revenue : employee.value,
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <BarChartCard
      title="Productividad por empleada"
      description="Ingresos generados o citas atendidas en el periodo."
      loading={isLoading}
      empty={!isLoading && total === 0}
      emptyMessage="No hay citas atendidas por empleada en el periodo."
      data={chartData}
      categoryKey="label"
      series={[{ dataKey: 'value', name: metric === 'revenue' ? 'Ingresos' : 'Citas' }]}
      valueFormatter={(value) =>
        metric === 'revenue' ? formatMoneyCompact(value, CURRENCY) : formatNumber(value)
      }
      actions={
        <SegmentedControl
          ariaLabel="Métrica de empleadas"
          size="sm"
          value={metric}
          onChange={setMetric}
          options={METRIC_OPTIONS}
        />
      }
    />
  );
}
