import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/env';
import { formatMoney } from '@/lib/format';
import { PrintButton } from './print-button';

/** No se cachea: un ticket se consulta poco y siempre debe reflejar la realidad. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu ticket',
  // El enlace viaja por WhatsApp; que no acabe indexado en un buscador.
  robots: { index: false, follow: false },
};

interface Linea {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

interface Ticket {
  number: string;
  issuedAt: string;
  items: Linea[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  clientName: string | null;
  salonName: string;
}

async function getTicket(token: string): Promise<Ticket | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/invoices/ticket/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Ticket };
    return body.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Ticket que recibe la clienta por WhatsApp.
 *
 * Es una página pública protegida por el token del enlace, con aspecto de
 * recibo y pensada para imprimirse o guardarse como PDF desde el propio
 * navegador (no hace falta generar un fichero en el servidor).
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.JSX.Element> {
  const { token } = await params;
  const ticket = await getTicket(token);
  if (!ticket) notFound();

  const fecha = new Date(ticket.issuedAt).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const lineas = Array.isArray(ticket.items) ? ticket.items : [];

  return (
    <main className="min-h-dvh bg-cream px-4 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-md">
        <article className="overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-card print:border-0 print:shadow-none">
          <header className="border-b border-dashed border-gold/40 px-6 py-6 text-center">
            <p className="font-serif text-xl font-semibold text-ink">{ticket.salonName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-soft/70">Ticket</p>
            <p className="mt-3 font-mono text-sm text-ink">{ticket.number}</p>
            <p className="text-xs text-ink-soft/80">{fecha}</p>
            {ticket.clientName ? (
              <p className="mt-3 text-sm text-ink-soft">Para {ticket.clientName}</p>
            ) : null}
          </header>

          <div className="px-6 py-5">
            {lineas.length === 0 ? (
              <p className="text-center text-sm text-ink-soft/70">Sin líneas de detalle.</p>
            ) : (
              <ul className="space-y-3">
                {lineas.map((linea, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 text-sm">
                    <span className="min-w-0 text-ink">
                      {linea.description ?? 'Servicio'}
                      {linea.quantity && linea.quantity > 1 ? (
                        <span className="text-ink-soft/70"> × {linea.quantity}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-medium text-ink">
                      {formatMoney(linea.total ?? linea.unitPrice ?? 0, ticket.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-dashed border-gold/40 px-6 py-5">
            {ticket.tax > 0 ? (
              <>
                <div className="flex justify-between text-sm text-ink-soft">
                  <span>Subtotal</span>
                  <span>{formatMoney(ticket.subtotal, ticket.currency)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm text-ink-soft">
                  <span>Impuestos</span>
                  <span>{formatMoney(ticket.tax, ticket.currency)}</span>
                </div>
              </>
            ) : null}
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-serif text-lg font-semibold text-ink">Total</span>
              <span className="font-serif text-2xl font-semibold text-brand-600">
                {formatMoney(ticket.total, ticket.currency)}
              </span>
            </div>
          </div>

          <footer className="border-t border-dashed border-gold/40 px-6 py-5 text-center">
            <p className="text-xs text-ink-soft/80">¡Gracias por tu visita!</p>
          </footer>
        </article>

        <div className="mt-6 flex justify-center print:hidden">
          <PrintButton />
        </div>
      </div>
    </main>
  );
}
