import * as React from 'react';
import { CalendarClock, CreditCard, Scissors } from 'lucide-react';
import { Card } from '@/components/ui';
import { EmptyState, MoneyText, StatusBadge } from '@/components/common';
import { formatDateTime } from '@/lib/format';
import type { ClientBooking, ClientPayment } from '@/lib/hooks/clients';

/** Etiquetas en español para los métodos de pago. */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  STRIPE: 'Stripe',
  GIFTCARD: 'Tarjeta regalo',
  VOUCHER: 'Bono',
};

function BookingRow({ booking }: { booking: ClientBooking }): React.JSX.Element {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
        <Scissors className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{booking.service?.name ?? 'Servicio'}</p>
        <p className="truncate text-xs text-ink-soft/70">
          {formatDateTime(booking.startAt)}
          {booking.employee ? ` · ${booking.employee.name}` : ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={booking.status} />
        {booking.price > 0 ? (
          <MoneyText cents={booking.price} className="text-xs text-ink-soft" />
        ) : null}
      </div>
    </li>
  );
}

function PaymentRow({ payment }: { payment: ClientPayment }): React.JSX.Element {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
        <CreditCard className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
        </p>
        <p className="truncate text-xs text-ink-soft/70">{formatDateTime(payment.createdAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <MoneyText cents={payment.amount} currency={payment.currency} className="font-medium" />
        <StatusBadge status={payment.status} />
      </div>
    </li>
  );
}

/**
 * Pestaña "Historial" de la ficha: dos columnas con las últimas citas y los
 * últimos pagos de la clienta (los embebe la API en la ficha).
 */
export function ClientHistory({
  bookings,
  payments,
}: {
  bookings: ClientBooking[];
  payments: ClientPayment[];
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <CalendarClock className="size-5 text-brand-500" aria-hidden="true" />
          Últimas citas
        </h3>
        {bookings.length > 0 ? (
          <ul className="divide-y divide-brand-50">
            {bookings.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="Sin citas"
            description="Todavía no hay citas registradas para esta clienta."
            className="py-10"
          />
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <CreditCard className="size-5 text-brand-500" aria-hidden="true" />
          Últimos pagos
        </h3>
        {payments.length > 0 ? (
          <ul className="divide-y divide-brand-50">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="Sin pagos"
            description="Todavía no hay pagos registrados para esta clienta."
            className="py-10"
          />
        )}
      </Card>
    </div>
  );
}
