import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common';
import { PlansManager } from '@/components/superadmin/plans-manager';

export const metadata: Metadata = {
  title: 'Planes · Plataforma',
  description: 'Catálogo y precios de los planes de la plataforma.',
};

/** CRUD de planes de la plataforma (SPEC §6). */
export default function PlanesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes"
        description="Gestiona el catálogo de planes, sus precios mensuales y los módulos que activan."
        breadcrumbs={[{ label: 'Plataforma', href: '/plataforma' }, { label: 'Planes' }]}
      />
      <PlansManager />
    </div>
  );
}
