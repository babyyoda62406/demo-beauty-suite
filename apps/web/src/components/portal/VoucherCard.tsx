'use client';

import * as React from 'react';
import { Ticket } from 'lucide-react';
import { StatusBadge, type StatusConfig } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatDate, formatMoney } from '@/lib/format';
import type { Voucher } from '@/lib/hooks/portal';

/** Etiquetas de estado propias de los bonos. */
const VOUCHER_STATUS: Record<string, StatusConfig> = {
  active: { label: 'Activo', variant: 'success' },
  used: { label: 'Agotado', variant: 'neutral' },
  expired: { label: 'Caducado', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
};

export interface VoucherCardProps {
  voucher: Voucher;
  className?: string;
}

/** Tarjeta de un bono de sesiones prepagadas con su saldo y progreso. */
export function VoucherCard({ voucher, className }: VoucherCardProps): React.JSX.Element {
  const total = Math.max(voucher.totalSessions, 1);
  const used = Math.min(voucher.usedSessions, total);
  const pct = Math.round((used / total) * 100);
  const isActive = voucher.status === 'ACTIVE';

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white/80 p-5 shadow-card backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Ticket className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-serif text-lg font-semibold text-ink">
              Bono de {voucher.totalSessions} sesiones
            </h3>
            <p className="text-sm text-ink-soft/70">{formatMoney(voucher.price, voucher.currency)}</p>
          </div>
        </div>
        <StatusBadge status={voucher.status} overrides={VOUCHER_STATUS} />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-2xl font-bold text-ink">
            {voucher.remainingSessions}
            <span className="text-sm font-medium text-ink-soft/70"> / {voucher.totalSessions} restantes</span>
          </span>
          <span className="text-xs text-ink-soft/60">{pct}% usado</span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-brand-50"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className={cn('h-full rounded-full transition-all', isActive ? 'bg-brand-gradient' : 'bg-ink-soft/30')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {voucher.expiresAt ? (
        <p className="text-xs text-ink-soft/60">
          Válido hasta el {formatDate(voucher.expiresAt)}
        </p>
      ) : null}
    </article>
  );
}
