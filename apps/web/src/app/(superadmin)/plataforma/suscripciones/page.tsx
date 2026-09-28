import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common';
import { SubscriptionsTable } from '@/components/superadmin/subscriptions-table';

export const metadata: Metadata = {
  title: 'Suscripciones · Plataforma',
  description: 'Suscripciones e ingresos recurrentes por salón.',
};

/** Suscripciones por salón e ingresos recurrentes (SPEC §6). */
export default function SuscripcionesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Suscripciones"
        description="Plan contratado, importe mensual y suscripciones activas de cada salón."
        breadcrumbs={[{ label: 'Plataforma', href: '/plataforma' }, { label: 'Suscripciones' }]}
      />
      <SubscriptionsTable />
    </div>
  );
}
