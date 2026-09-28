import * as React from 'react';
import type { Metadata } from 'next';
import { CitasView } from '@/components/portal';

export const metadata: Metadata = {
  title: 'Mis citas · Estudio Aurora',
  description: 'Consulta tus próximas citas y tu historial, reprograma o cancela.',
};

/** Página "Mis citas" del portal de la clienta (SPEC §9). */
export default function ClientAppointmentsPage(): React.JSX.Element {
  return <CitasView />;
}
