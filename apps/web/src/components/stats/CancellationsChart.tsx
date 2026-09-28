'use client';

import * as React from 'react';
import { DonutChartCard, ErrorState } from '@/components/common';
import { formatNumber, formatPercent } from '@/lib/format';
import { useCancellations, type StatsRangeParams } from '@/lib/hooks/stats';

export interface CancellationsChartProps {
  range: StatsRangeParams;
}

/** Etiquetas en español para cada estado de cita. */
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendientes',
  CONFIRMED: 'Confirmadas',
  COMPLETED: 'Completadas',
  CANCELLED: 'Canceladas',
  NO_SHOW: 'Ausencias',
};

/** Color semántico por estado (verde ok, rojo cancelada, ámbar ausencia). */
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9CA3AF',
  CONFIRMED: '#F075AE',
  COMPLETED: '#16A34A',
  CANCELLED: '#E11D48',
  NO_SHOW: '#F59E0B',
};

/**
 * Desglose de estados de cita del periodo (tarta/donut) con las tasas de
 * cancelación y ausencia (no-show) destacadas en la cabecera.
 */
export function CancellationsChart({ range }: CancellationsChartProps): React.JSX.Element {
  const { data, isLoading, error, refetch } = useCancellations(range);

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const chartData = (data?.series ?? []).map((point) => ({
    name: STATUS_LABELS[point.label] ?? point.label,
    value: point.value,
    color: STATUS_COLORS[point.label] ?? '#9CA3AF',
  }));

  const actions =
    data && data.total > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
          Cancelación {formatPercent(data.cancellationRate)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
          Ausencias {formatPercent(data.noShowRate)}
        </span>
      </div>
    ) : null;

  return (
    <DonutChartCard
      title="Cancelaciones y ausencias"
      description="Reparto de citas por estado en el periodo."
      loading={isLoading}
      empty={!isLoading && (!data || data.total === 0)}
      emptyMessage="No hay citas registradas en el periodo."
      data={chartData}
      valueFormatter={(value) => formatNumber(value)}
      actions={actions}
    />
  );
}
