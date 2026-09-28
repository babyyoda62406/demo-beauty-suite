import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DISENO_POR_DEFECTO, type DisenoId } from '@/components/gift-card/GiftCard';
import { getApiBaseUrl } from '@/lib/env';
import { formatMoney } from '@/lib/format';
import { Caras } from './caras';

/** El saldo cambia con cada uso: nunca se cachea. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu tarjeta regalo',
  // El enlace viaja por WhatsApp; que no acabe indexado en un buscador.
  robots: { index: false, follow: false },
};

interface Tarjeta {
  code: string;
  design: string;
  recipientName: string | null;
  senderName: string | null;
  serviceName: string | null;
  initialAmount: number;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string | null;
  createdAt: string;
}

/**
 * El parámetro de la ruta es el secreto del enlace, no el código del mostrador.
 * Con 256 bits no se puede adivinar una tarjeta probando.
 */
async function getTarjeta(token: string): Promise<Tarjeta | null> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/v1/gift-cards/public/${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Tarjeta };
    return body.data ?? null;
  } catch {
    return null;
  }
}

/** Qué decirle a quien abre el enlace, según cómo esté la tarjeta. */
const ESTADO: Record<Tarjeta['status'], { texto: string; tono: string }> = {
  ACTIVE: { texto: 'Lista para usar', tono: 'border-emerald-300/60 bg-emerald-50 text-emerald-800' },
  REDEEMED: { texto: 'Ya gastada', tono: 'border-neutral-300 bg-neutral-100 text-neutral-600' },
  EXPIRED: { texto: 'Caducada', tono: 'border-amber-300 bg-amber-50 text-amber-800' },
  CANCELLED: { texto: 'Anulada', tono: 'border-rose-300 bg-rose-50 text-rose-800' },
};

/**
 * La tarjeta regalo tal y como la ve quien la recibe.
 *
 * Página pública protegida por el secreto del enlace, igual que el ticket de
 * caja. La tarjeta se gira al tocarla y el QR del dorso es el que escanea el
 * salón para ir descontando.
 */
export default async function TarjetaRegaloPage({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<React.JSX.Element> {
  const { code: token } = await params;
  const tarjeta = await getTarjeta(token);
  if (!tarjeta) notFound();

  const estado = ESTADO[tarjeta.status] ?? ESTADO.ACTIVE;
  const gastado = tarjeta.initialAmount - tarjeta.balance;
  const caduca = tarjeta.expiresAt
    ? new Date(tarjeta.expiresAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const datos = {
    para: tarjeta.recipientName ?? '',
    de: tarjeta.senderName ?? '',
    // El QR apunta a esta misma página: quien la recibe la abre, y el salón la
    // escanea de la pantalla para descontar.
    enlace: `https://estudioaurora.demo/regalo/${token}`,
  };
  // El saldo y el código no van impresos en la tarjeta —el diseño no los
  // contempla— sino en la ficha de debajo.
  const diseno = (tarjeta.design as DisenoId) || DISENO_POR_DEFECTO;

  return (
    <main className="min-h-dvh bg-cream px-4 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 text-center print:hidden">
          {tarjeta.recipientName ? (
            <p className="font-script text-3xl text-brand-600">Para {tarjeta.recipientName}</p>
          ) : (
            <p className="font-serif text-2xl font-semibold text-ink">Tu tarjeta regalo</p>
          )}
          <p className="mt-1 text-sm text-ink-soft">Estudio Aurora · Spa de Uñas</p>
        </header>

        <Caras datos={datos} diseno={diseno} codigo={tarjeta.code} />

        <section className="mt-8 rounded-2xl border border-gold/30 bg-white p-6 shadow-card print:hidden">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-serif text-lg text-ink">
              {tarjeta.serviceName ? 'Vale por' : 'Saldo disponible'}
            </span>
            <span className="text-right font-serif text-3xl font-semibold text-brand-600">
              {tarjeta.serviceName ?? formatMoney(tarjeta.balance, tarjeta.currency)}
            </span>
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            {tarjeta.serviceName ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Saldo</dt>
                <dd className="text-ink">{formatMoney(tarjeta.balance, tarjeta.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Importe original</dt>
              <dd className="text-ink">{formatMoney(tarjeta.initialAmount, tarjeta.currency)}</dd>
            </div>
            {gastado > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Ya utilizado</dt>
                <dd className="text-ink">{formatMoney(gastado, tarjeta.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Código</dt>
              <dd className="font-mono text-ink">{tarjeta.code}</dd>
            </div>
            {caduca ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Válida hasta</dt>
                <dd className="text-ink">{caduca}</dd>
              </div>
            ) : null}
          </dl>

          <p className={`mt-5 rounded-xl border px-4 py-3 text-center text-sm ${estado.tono}`}>
            {estado.texto}
            {tarjeta.status === 'ACTIVE'
              ? ' — enseña el código QR en el salón y se descuenta de tu saldo.'
              : ''}
          </p>
        </section>
      </div>
    </main>
  );
}
