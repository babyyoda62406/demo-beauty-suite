'use client';

import * as React from 'react';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/common';
import {
  getDateRange,
  formatDateRange,
  type DateRangePreset,
  type DateRange,
} from '@/lib/format';
import type { StatsRangeParams } from '@/lib/hooks/stats';
import { StatsRangeSelector } from './StatsRangeSelector';
import { StatsKpis } from './StatsKpis';
import { RevenueChart } from './RevenueChart';
import { TopServicesChart } from './TopServicesChart';
import { ClientsChart } from './ClientsChart';
import { PeakHoursChart } from './PeakHoursChart';
import { CancellationsChart } from './CancellationsChart';
import { EmployeesChart } from './EmployeesChart';

/** Convierte un rango de fechas a los parámetros ISO que esperan los endpoints. */
function toParams(range: DateRange): StatsRangeParams {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

/**
 * Panel de Estadísticas del salón (SPEC §7 `stats`). Orquesta el selector de
 * rango de fechas y todas las gráficas, cada una con su propio estado de carga,
 * vacío y error. El rango vive en el cliente y se propaga a los hooks de datos.
 */
export function StatsView(): React.JSX.Element {
  const [preset, setPreset] = React.useState<DateRangePreset>('last30');
  const range = React.useMemo(() => getDateRange(preset), [preset]);
  const params = React.useMemo(() => toParams(range), [range]);

  return (
    <div>
      <PageHeader
        title="Estadísticas"
        description={`Rendimiento del salón · ${formatDateRange(range)}`}
        icon={<BarChart3 className="size-7" aria-hidden="true" />}
        actions={<StatsRangeSelector value={preset} onChange={setPreset} />}
      />

      <StatsKpis range={params} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <RevenueChart range={params} />
        </div>
        <TopServicesChart range={params} />
        <ClientsChart range={params} />
        <div className="lg:col-span-2">
          <PeakHoursChart range={params} />
        </div>
        <CancellationsChart range={params} />
        <EmployeesChart range={params} />
      </div>
    </div>
  );
}
