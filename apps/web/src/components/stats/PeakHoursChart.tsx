'use client';

import * as React from 'react';
import { BarChartCard, ErrorState } from '@/components/common';
import { formatNumber } from '@/lib/format';
import { usePeakHours, type StatsRangeParams } from '@/lib/hooks/stats';

export interface PeakHoursChartProps {
  range: StatsRangeParams;
}

/** Franja horaria de apertura típica de un salón (evita ruido de horas muertas). */
const OPENING_HOUR = 8;
const CLOSING_HOUR = 21;

/**
 * Volumen de citas por hora del día (barras). Se muestran las franjas de
 * apertura del salón para resaltar las horas pico reales.
 */
export function PeakHoursChart({ range }: PeakHoursChartProps): React.JSX.Element {
  const { data, isLoading, error, refetch } = usePeakHours(range);

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const chartData = (data?.series ?? [])
    .filter((_, hour) => hour >= OPENING_HOUR && hour <= CLOSING_HOUR)
    .map((point) => ({ label: point.label, value: point.value }));
  const hasBookings = chartData.some((point) => point.value > 0);

  return (
    <BarChartCard
      title="Horas pico"
      description="Citas atendidas por hora del día."
      loading={isLoading}
      empty={!isLoading && !hasBookings}
      emptyMessage="No hay citas registradas en el periodo."
      data={chartData}
      categoryKey="label"
      series={[{ dataKey: 'value', name: 'Citas' }]}
      valueFormatter={(value) => formatNumber(value)}
    />
  );
}
