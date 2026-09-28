'use client';

import * as React from 'react';
import { Gift } from 'lucide-react';
import { StatusBadge, type StatusConfig } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatDate, formatMoney } from '@/lib/format';
import type { GiftCard } from '@/lib/hooks/portal';

/** Etiquetas de estado propias de las tarjetas regalo. */
const GIFT_CARD_STATUS: Record<string, StatusConfig> = {
  active: { label: 'Activa', variant: 'success' },
  redeemed: { label: 'Canjeada', variant: 'neutral' },
  expired: { label: 'Caducada', variant: 'danger' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
};

export interface GiftCardCardProps {
  giftCard: GiftCard;
  className?: string;
}

/** Tarjeta regalo con estética de "gift card": saldo, código y validez. */
export function GiftCardCard({ giftCard, className }: GiftCardCardProps): React.JSX.Element {
  const total = Math.max(giftCard.initialAmount, 1);
  const pct = Math.round((Math.min(giftCard.balance, total) / total) * 100);

  return (
    <article
      className={cn(
        'relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-brand-100 bg-brand-gradient p-5 text-white shadow-card',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-white/85">
          <Gift className="size-5" aria-hidden="true" />
          Tarjeta regalo
        </span>
        <StatusBadge
          status={giftCard.status}
          overrides={GIFT_CARD_STATUS}
          className="bg-white/20 text-white"
        />
      </div>

      <div className="relative">
        <p className="text-xs uppercase tracking-widest text-white/70">Saldo disponible</p>
        <p className="mt-1 font-serif text-3xl font-bold">
          {formatMoney(giftCard.balance, giftCard.currency)}
        </p>
        <p className="mt-0.5 text-xs text-white/70">
          de {formatMoney(giftCard.initialAmount, giftCard.currency)} iniciales
        </p>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/20 pt-3 text-xs text-white/80">
        <span className="font-mono tracking-wider">{giftCard.code}</span>
        {giftCard.expiresAt ? <span>Válida hasta {formatDate(giftCard.expiresAt)}</span> : null}
      </div>
    </article>
  );
}
