import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common';
import { ModulesManager } from '@/components/superadmin/modules-manager';

export const metadata: Metadata = {
  title: 'Módulos · Plataforma',
  description: 'Activación de módulos de negocio por salón.',
};

/** Activación de módulos por salón (SPEC §6/§7). */
export default function ModulosPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Módulos"
        description="Activa o desactiva los módulos de negocio de cada salón según su plan y necesidades."
        breadcrumbs={[{ label: 'Plataforma', href: '/plataforma' }, { label: 'Módulos' }]}
      />
      <ModulesManager />
    </div>
  );
}
