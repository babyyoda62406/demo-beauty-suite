import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common';
import { TicketsTable } from '@/components/superadmin/tickets-table';

export const metadata: Metadata = {
  title: 'Incidencias · Plataforma',
  description: 'Tickets de soporte de todos los salones.',
};

/** Incidencias de soporte de la plataforma (SPEC §7). */
export default function IncidenciasPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidencias"
        description="Tickets de soporte de todos los salones. Filtra por estado y prioridad, y gestiona su ciclo de vida."
        breadcrumbs={[{ label: 'Plataforma', href: '/plataforma' }, { label: 'Incidencias' }]}
      />
      <TicketsTable />
    </div>
  );
}
