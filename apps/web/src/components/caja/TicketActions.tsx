'use client';

import * as React from 'react';
import { ExternalLink, Loader2, MessageCircle } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { apiClient } from '@/lib/hooks/use-api';

/**
 * Compartir el ticket de una factura ya emitida.
 *
 * El enlace se pide al vuelo (la API lo crea la primera vez) porque WhatsApp
 * sólo admite texto: se manda la dirección del ticket, y la clienta lo abre y
 * lo guarda como PDF desde su propio navegador si quiere.
 */
export function TicketActions({ invoiceId }: { invoiceId: string }): React.JSX.Element {
  const [cargando, setCargando] = React.useState<'ver' | 'whatsapp' | null>(null);

  const obtenerUrl = async (): Promise<string | null> => {
    try {
      const { token } = await apiClient.get<{ token: string }>(`invoices/${invoiceId}/share`);
      return `${window.location.origin}/ticket/${token}`;
    } catch {
      toast({ title: 'No se ha podido preparar el ticket', variant: 'danger' });
      return null;
    }
  };

  const ver = async (): Promise<void> => {
    setCargando('ver');
    const url = await obtenerUrl();
    setCargando(null);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const porWhatsapp = async (): Promise<void> => {
    setCargando('whatsapp');
    const url = await obtenerUrl();
    setCargando(null);
    if (!url) return;
    const texto = `¡Hola! Aquí tienes tu ticket: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => void ver()} disabled={cargando !== null}>
        {cargando === 'ver' ? <Loader2 className="animate-spin" /> : <ExternalLink aria-hidden="true" />}
        Ver ticket
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void porWhatsapp()} disabled={cargando !== null}>
        {cargando === 'whatsapp' ? <Loader2 className="animate-spin" /> : <MessageCircle aria-hidden="true" />}
        WhatsApp
      </Button>
    </div>
  );
}
