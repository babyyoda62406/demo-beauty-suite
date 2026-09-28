'use client';

import * as React from 'react';
import { CalendarRange, CheckCircle2, TrendingUp, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatGrid, StatCard, ErrorState } from '@/components/common';
import { useEmployeePerformance } from '@/lib/hooks/employees';
import {
  formatMoney,
  formatNumber,
  DATE_RANGE_PRESET_LABELS,
  getDateRange,
  dateRangeToQuery,
  type DateRangePreset,
} from '@/lib/format';
import { cn } from '@/lib/utils';

const PRESETS: DateRangePreset[] = ['thisMonth', 'lastMonth', 'last30', 'thisYear'];

export interface PerformanceTabProps {
  employeeId: string;
}

/** Pestaña Rendimiento: nº de citas e ingresos del profesional en una ventana. */
export function PerformanceTab({ employeeId }: PerformanceTabProps): React.JSX.Element {
  const [preset, setPreset] = React.useState<DateRangePreset>('thisMonth');
  const range = React.useMemo(() => getDateRange(preset), [preset]);
  const iso = React.useMemo(() => {
    const { from, to } = dateRangeToQuery(range);
    return { from: new Date(`${from}T00:00:00.000Z`).toISOString(), to: new Date(`${to}T23:59:59.999Z`).toISOString() };
  }, [range]);

  const query = useEmployeePerformance(employeeId, iso);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange className="size-4 text-ink-soft/60" aria-hidden="true" />
        {PRESETS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === preset ? 'primary' : 'outline'}
            onClick={() => setPreset(p)}
            className={cn(p !== preset && 'text-ink-soft')}
          >
            {DATE_RANGE_PRESET_LABELS[p]}
          </Button>
        ))}
      </div>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <StatGrid columns={4}>
          <StatCard
            label="Citas totales"
            value={formatNumber(query.data?.totalBookings ?? 0)}
            icon={TrendingUp}
            loading={query.isLoading}
          />
          <StatCard
            label="Completadas"
            value={formatNumber(query.data?.completedBookings ?? 0)}
            icon={CheckCircle2}
            loading={query.isLoading}
          />
          <StatCard
            label="Canceladas / No-show"
            value={formatNumber((query.data?.cancelledBookings ?? 0) + (query.data?.noShowBookings ?? 0))}
            icon={XCircle}
            loading={query.isLoading}
          />
          <StatCard
            label="Ingresos generados"
            value={formatMoney(query.data?.revenue ?? 0, query.data?.currency)}
            icon={TrendingUp}
            loading={query.isLoading}
            hint="Solo citas completadas"
          />
        </StatGrid>
      )}
    </div>
  );
}
