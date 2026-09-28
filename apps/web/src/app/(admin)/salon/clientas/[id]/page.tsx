import * as React from 'react';
import type { Metadata } from 'next';
import { ClientDetail } from '@/components/crm/client-detail';

export const metadata: Metadata = {
  title: 'Ficha de clienta · Salón',
  description: 'Ficha completa: información, historial, fotos y notas privadas.',
};

/** Ficha completa de una clienta (SPEC §9). */
export default async function ClientaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ClientDetail clientId={id} />;
}
