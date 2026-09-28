import * as React from 'react';
import type { Metadata } from 'next';
import { FidelizacionView } from '@/components/portal';

export const metadata: Metadata = {
  title: 'Fidelización · Estudio Aurora',
  description: 'Tu tarjeta de sellos, tus regalos y el historial de movimientos.',
};

/** Página de fidelización del portal de la clienta (SPEC §9). */
export default function ClientLoyaltyPage(): React.JSX.Element {
  return <FidelizacionView />;
}
