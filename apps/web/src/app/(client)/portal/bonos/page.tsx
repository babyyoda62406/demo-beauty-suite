import * as React from 'react';
import type { Metadata } from 'next';
import { BonosView } from '@/components/portal';

export const metadata: Metadata = {
  title: 'Bonos y tarjetas regalo · Estudio Aurora',
  description: 'Consulta el saldo de tus bonos y tarjetas regalo.',
};

/** Página de bonos y tarjetas regalo del portal de la clienta (SPEC §9). */
export default function ClientVouchersPage(): React.JSX.Element {
  return <BonosView />;
}
