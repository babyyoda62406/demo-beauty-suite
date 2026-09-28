import * as React from 'react';
import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { EmployeesTable } from '@/components/empleadas';

export const metadata: Metadata = {
  title: 'Empleadas',
  description: 'Equipo de profesionales: horarios, ausencias, comisiones y rendimiento.',
};

/**
 * Empleadas / equipo del salón: alta y edición de profesionales, y ficha de
 * detalle con horarios, ausencias, comisiones y rendimiento (SPEC §6).
 */
export default function EmpleadasPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleadas"
        description="Gestiona el equipo de profesionales: horarios, ausencias, comisiones y rendimiento."
        icon={<Users className="size-6" aria-hidden="true" />}
      />
      <EmployeesTable />
    </div>
  );
}
