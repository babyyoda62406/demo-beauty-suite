import * as React from 'react';
import type { Metadata } from 'next';
import { AgendaView } from '@/components/agenda';

export const metadata: Metadata = {
  title: 'Agenda',
  description: 'Agenda del salón: citas por profesional, reprogramación y estados.',
};

/**
 * Agenda del salón (SPEC §7 — pantalla estrella). La orquestación es cliente
 * (`AgendaView`), que a su vez carga el calendario con `next/dynamic({ssr:false})`.
 */
export default function SalonAgendaPage(): React.JSX.Element {
  return <AgendaView />;
}
