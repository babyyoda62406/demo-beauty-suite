import * as React from 'react';
import type { Metadata } from 'next';
import { PortalDashboard } from '@/components/portal';

export const metadata: Metadata = {
  title: 'Mi portal · Estudio Aurora',
  description: 'Tu próxima cita, tus sellos de fidelización y accesos rápidos.',
};

/** Dashboard del portal de la clienta (SPEC §9). */
export default function ClientDashboardPage(): React.JSX.Element {
  return <PortalDashboard />;
}
