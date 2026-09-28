import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common';
import { TenantsTable } from '@/components/superadmin/tenants-table';

export const metadata: Metadata = {
  title: 'Salones · Plataforma',
  description: 'Gestión de salones de la plataforma FGD Beauty Suite.',
};

/** Listado global de salones con métricas, alta e impersonación (SPEC §7). */
export default function PlataformaSalonesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Salones"
        description="Todos los salones de la plataforma con sus métricas de uso. Da de alta nuevos salones o entra como salón para dar soporte."
        breadcrumbs={[{ label: 'Plataforma', href: '/plataforma' }, { label: 'Salones' }]}
      />
      <TenantsTable />
    </div>
  );
}
