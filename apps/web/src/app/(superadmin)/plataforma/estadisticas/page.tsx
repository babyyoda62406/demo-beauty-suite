import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common';
import { PlatformStats } from '@/components/superadmin/platform-stats';

export const metadata: Metadata = {
  title: 'Estadísticas · Plataforma',
  description: 'KPIs globales de la plataforma: salones, MRR y citas.',
};

/** Estadísticas globales de la plataforma (SPEC §7). */
export default function EstadisticasPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas"
        description="Visión global de la plataforma: salones, ingresos recurrentes, citas e incidencias."
        breadcrumbs={[{ label: 'Plataforma', href: '/plataforma' }, { label: 'Estadísticas' }]}
      />
      <PlatformStats />
    </div>
  );
}
