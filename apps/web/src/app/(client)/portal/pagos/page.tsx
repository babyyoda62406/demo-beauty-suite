import * as React from 'react';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { PaymentsHistoryView } from '@/components/portal-b';

/** Historial de pagos y facturas de la clienta (SPEC §9 — portal clienta). */
export default function PortalPagosPage(): React.JSX.Element {
  return (
    <div>
      <PageHeader
        title="Mis pagos"
        description="Consulta el historial de tus pagos y descarga tus facturas."
        icon={<CreditCard className="size-7" aria-hidden="true" />}
      />
      <PaymentsHistoryView />
    </div>
  );
}
