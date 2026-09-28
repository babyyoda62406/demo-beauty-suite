import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common';
import { ClientsTable } from '@/components/crm/clients-table';

export const metadata: Metadata = {
  title: 'Clientas · Salón',
  description: 'CRM de clientas: fichas, historial y fidelización.',
};

/** Listado de clientas del salón (CRM — SPEC §9). */
export default function ClientasPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientas"
        description="Gestiona las fichas de tus clientas: contacto, cumpleaños, puntos y más."
        breadcrumbs={[{ label: 'Salón', href: '/salon' }, { label: 'Clientas' }]}
      />
      <ClientsTable />
    </div>
  );
}
