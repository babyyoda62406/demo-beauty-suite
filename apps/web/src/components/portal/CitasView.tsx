'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarHeart, CalendarPlus } from 'lucide-react';
import {
  Button,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { EmptyState, ErrorState, PageHeader } from '@/components/common';
import { useMyBookings, type AgendaBooking } from '@/lib/hooks/portal';
import { BookingCard } from './BookingCard';
import { CancelBookingDialog } from './CancelBookingDialog';
import { RescheduleDialog } from './RescheduleDialog';

/** Estados que mantienen una cita en el grupo de "próximas" (accionables). */
const UPCOMING_STATUSES = new Set(['PENDING', 'CONFIRMED']);

function BookingListSkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-2xl" />
      ))}
    </div>
  );
}

/** Vista "Mis citas": próximas y pasadas, con reprogramar / cancelar y reserva. */
export function CitasView(): React.JSX.Element {
  const { data, isPending, isError, error, refetch } = useMyBookings();
  const [toCancel, setToCancel] = React.useState<AgendaBooking | null>(null);
  const [toReschedule, setToReschedule] = React.useState<AgendaBooking | null>(null);

  const { upcoming, past } = React.useMemo(() => {
    const list = data?.data ?? [];
    const now = Date.now();
    const up: AgendaBooking[] = [];
    const old: AgendaBooking[] = [];
    for (const booking of list) {
      const isUpcoming =
        new Date(booking.startAt).getTime() >= now && UPCOMING_STATUSES.has(booking.status);
      (isUpcoming ? up : old).push(booking);
    }
    up.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    old.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    return { upcoming: up, past: old };
  }, [data]);

  const reservarButton = (
    <Button asChild>
      <Link href="/reservar">
        <CalendarPlus aria-hidden="true" />
        Reservar cita
      </Link>
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Mis citas"
        description="Consulta tus próximas visitas, reprográmalas o reserva una nueva."
        actions={reservarButton}
      />

      {isPending ? (
        <BookingListSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Pasadas ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarHeart}
                title="No tienes citas próximas"
                description="Reserva tu próxima cita y te esperamos con muchas ganas."
                action={reservarButton}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={setToCancel}
                    onReschedule={setToReschedule}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {past.length === 0 ? (
              <EmptyState
                icon={CalendarHeart}
                title="Aún no hay historial"
                description="Aquí verás tus citas pasadas cuando las tengas."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {past.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <CancelBookingDialog
        booking={toCancel}
        open={toCancel !== null}
        onOpenChange={(open) => !open && setToCancel(null)}
      />
      <RescheduleDialog
        booking={toReschedule}
        open={toReschedule !== null}
        onOpenChange={(open) => !open && setToReschedule(null)}
      />
    </div>
  );
}
