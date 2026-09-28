'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarHeart, Gift, Sparkles, Ticket } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState, StatCard } from '@/components/common';
import { formatTime, formatWeekday } from '@/lib/format';
import {
  STAMPS_PER_REWARD,
  useMyBookings,
  useMyLoyaltyCard,
  useMyVouchers,
  type AgendaBooking,
} from '@/lib/hooks/portal';
import { BookingCard } from './BookingCard';
import { LoyaltyStampCard } from './LoyaltyStampCard';
import { QuickActions } from './QuickActions';

const UPCOMING_STATUSES = new Set(['PENDING', 'CONFIRMED']);

/** Dashboard del portal: próxima cita, sellos de fidelización y accesos rápidos. */
export function PortalDashboard(): React.JSX.Element {
  const loyalty = useMyLoyaltyCard();
  const bookings = useMyBookings();
  const vouchers = useMyVouchers();

  const nextBooking = React.useMemo<AgendaBooking | null>(() => {
    const list = bookings.data?.data ?? [];
    const now = Date.now();
    const upcoming = list
      .filter(
        (b) => new Date(b.startAt).getTime() >= now && UPCOMING_STATUSES.has(b.status),
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return upcoming[0] ?? null;
  }, [bookings.data]);

  const activeVouchers = React.useMemo(
    () => (vouchers.data ?? []).filter((v) => v.status === 'ACTIVE').length,
    [vouchers.data],
  );

  const stamps = loyalty.data?.stamps ?? 0;
  const remaining = STAMPS_PER_REWARD - stamps;
  const freeEarned = loyalty.data?.freeEarned ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
          Hola de nuevo{' '}
          <span className="font-display font-normal text-brand-600">✨</span>
        </h1>
        <p className="text-sm text-ink-soft/70">
          Este es el resumen de tu actividad y tus beneficios.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Próxima cita"
          icon={CalendarHeart}
          loading={bookings.isPending}
          value={nextBooking ? formatWeekday(nextBooking.startAt) : '—'}
          hint={
            nextBooking
              ? `${formatTime(nextBooking.startAt)} · ${nextBooking.service?.name ?? 'Servicio'}`
              : 'Sin citas próximas'
          }
        />
        <StatCard
          label="Sellos"
          icon={Sparkles}
          loading={loyalty.isPending}
          value={`${stamps}/${STAMPS_PER_REWARD}`}
          hint={
            freeEarned > 0
              ? '¡Regalo disponible!'
              : `Te ${remaining === 1 ? 'falta' : 'faltan'} ${remaining} para tu regalo`
          }
        />
        <StatCard
          label="Regalos"
          icon={Gift}
          loading={loyalty.isPending}
          value={freeEarned}
          hint={freeEarned > 0 ? 'Listos para canjear' : 'Completa tu tarjeta'}
        />
        <StatCard
          label="Bonos activos"
          icon={Ticket}
          loading={vouchers.isPending}
          value={activeVouchers}
          hint={activeVouchers > 0 ? 'Con sesiones disponibles' : 'Sin bonos activos'}
        />
      </div>

      {/* Próxima cita + fidelización */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Tu próxima cita</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/portal/citas">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {bookings.isPending ? (
              <Skeleton className="h-52 rounded-2xl" />
            ) : bookings.isError ? (
              <ErrorState
                error={bookings.error}
                onRetry={() => void bookings.refetch()}
                className="py-8"
              />
            ) : nextBooking ? (
              <BookingCard booking={nextBooking} />
            ) : (
              <EmptyState
                icon={CalendarHeart}
                title="No tienes citas próximas"
                description="Reserva tu próxima visita cuando quieras."
                action={
                  <Button asChild>
                    <Link href="/reservar">
                      <CalendarHeart aria-hidden="true" />
                      Reservar cita
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loyalty.isPending ? (
            <Skeleton className="h-72 rounded-3xl" />
          ) : loyalty.isError ? (
            <ErrorState
              error={loyalty.error}
              onRetry={() => void loyalty.refetch()}
              className="py-8"
            />
          ) : (
            <>
              <LoyaltyStampCard card={loyalty.data} compact />
              <Button asChild variant="secondary" className="w-full">
                <Link href="/portal/fidelizacion">Ver mi fidelización</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-ink">Accesos rápidos</h2>
        <QuickActions />
      </section>
    </div>
  );
}
