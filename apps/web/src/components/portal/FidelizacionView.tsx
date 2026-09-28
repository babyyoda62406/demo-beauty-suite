'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarHeart, Check, Gift, History, Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import { EmptyState, ErrorState, PageHeader } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { useMyLoyaltyCard, type LoyaltyTransaction } from '@/lib/hooks/portal';
import { LoyaltyStampCard } from './LoyaltyStampCard';

/** Traduce el motivo técnico de un movimiento a un texto amable. */
function transactionLabel(tx: LoyaltyTransaction): string {
  if (tx.reason === 'SERVICE_COMPLETED') return 'Servicio completado';
  if (tx.reason === 'REDEEM_FREE') return 'Recompensa canjeada';
  return tx.reason;
}

function LoyaltySkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Skeleton className="h-80 rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}

/** Vista de fidelización: tarjeta de sellos, regalos y movimientos. */
export function FidelizacionView(): React.JSX.Element {
  const { data: card, isPending, isError, error, refetch } = useMyLoyaltyCard();

  return (
    <div>
      <PageHeader
        title="Fidelización"
        description="Cada servicio suma un sello. Al completar tu tarjeta, tu siguiente cita es un regalo."
        icon={<Sparkles className="size-6" aria-hidden="true" />}
      />

      {isPending ? (
        <LoyaltySkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <LoyaltyStampCard card={card} />

            {card.freeEarned > 0 ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft">
                    <Gift className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-serif text-lg font-semibold text-ink">
                      {card.freeEarned === 1
                        ? '¡Tienes un regalo esperándote!'
                        : `¡Tienes ${card.freeEarned} regalos esperándote!`}
                    </p>
                    <p className="text-sm text-ink-soft/80">
                      Reserva tu cita y te aplicamos el servicio de regalo en el salón.
                    </p>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link href="/reservar">
                    <CalendarHeart aria-hidden="true" />
                    Reservar y canjear
                  </Link>
                </Button>
              </div>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="size-4 text-brand-500" aria-hidden="true" />
                  Movimientos recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {card.transactions.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="Todavía no hay sellos"
                    description="Tu primer servicio completado sumará tu primer sello."
                    className="py-8"
                  />
                ) : (
                  <ul className="divide-y divide-brand-50">
                    {card.transactions.map((tx) => {
                      const positive = tx.delta >= 0;
                      return (
                        <li key={tx.id} className="flex items-center gap-3 py-3">
                          <span
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-full',
                              positive ? 'bg-brand-50 text-brand-600' : 'bg-success/10 text-success',
                            )}
                          >
                            {positive ? (
                              <Check className="size-4" aria-hidden="true" />
                            ) : (
                              <Gift className="size-4" aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {transactionLabel(tx)}
                            </p>
                            <p className="text-xs text-ink-soft/60">{formatDate(tx.createdAt)}</p>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              positive ? 'text-brand-600' : 'text-success',
                            )}
                          >
                            {positive ? `+${tx.delta}` : tx.delta} {positive ? 'sello' : 'regalo'}
                            {Math.abs(tx.delta) === 1 ? '' : 's'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumen lateral */}
          <aside className="space-y-4">
            <Card>
              <CardContent className="grid grid-cols-3 gap-2 p-5 text-center lg:grid-cols-1 lg:gap-4 lg:text-left">
                <SummaryStat label="Sellos" value={card.stamps} accent />
                <SummaryStat label="Regalos" value={card.freeEarned} />
                <SummaryStat label="Canjeados" value={card.redeemedCount} />
              </CardContent>
            </Card>
            <div className="rounded-2xl border border-dashed border-brand-100 bg-surface-subtle/60 p-5 text-sm text-ink-soft/80">
              <p className="font-medium text-ink">¿Cómo funciona?</p>
              <p className="mt-1">
                Ganas 1 sello por cada servicio completado. Al llegar a 10, tu siguiente servicio es
                nuestro regalo para ti.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div className="lg:flex lg:items-baseline lg:justify-between">
      <p className="order-2 text-xs text-ink-soft/70 lg:order-1">{label}</p>
      <p
        className={cn(
          'order-1 font-serif text-2xl font-bold lg:order-2 lg:text-xl',
          accent ? 'text-brand-600' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
