'use client';

import * as React from 'react';
import { CalendarClock, Clock, Scissors, User } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatusBadge } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatDate, formatMoney, formatTime, formatWeekday } from '@/lib/format';
import type { AgendaBooking } from '@/lib/hooks/portal';

/** Estados de una cita sobre los que la clienta aún puede actuar. */
const MUTABLE_STATUSES = new Set(['PENDING', 'CONFIRMED']);

export interface BookingCardProps {
  booking: AgendaBooking;
  onCancel?: (booking: AgendaBooking) => void;
  onReschedule?: (booking: AgendaBooking) => void;
  className?: string;
}

/**
 * Tarjeta de una cita en el portal: servicio, profesional, fecha/hora, estado
 * e importe. Para citas futuras y accionables ofrece Reprogramar / Cancelar.
 */
export function BookingCard({
  booking,
  onCancel,
  onReschedule,
  className,
}: BookingCardProps): React.JSX.Element {
  const start = new Date(booking.startAt);
  const isFuture = start.getTime() >= Date.now();
  const canManage =
    isFuture && MUTABLE_STATUSES.has(booking.status) && (onCancel != null || onReschedule != null);

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white/80 p-5 shadow-card backdrop-blur-sm transition-shadow hover:shadow-glow',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Scissors className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-semibold text-ink">
              {booking.service?.name ?? 'Servicio'}
            </h3>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink-soft/80">
              <User className="size-3.5 shrink-0" aria-hidden="true" />
              {booking.employee?.name ?? 'Profesional por asignar'}
            </p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-subtle/60 p-3 text-sm">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="sr-only">Fecha</dt>
            <dd className="truncate font-medium text-ink">
              {formatWeekday(booking.startAt)}
            </dd>
            <dd className="truncate text-xs text-ink-soft/70">
              {formatDate(booking.startAt, "d 'de' MMMM")}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
          <div>
            <dt className="sr-only">Hora</dt>
            <dd className="font-medium text-ink">
              {formatTime(booking.startAt)} – {formatTime(booking.endAt)}
            </dd>
            <dd className="text-xs text-ink-soft/70">
              {formatMoney(booking.price, booking.currency)}
            </dd>
          </div>
        </div>
      </dl>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {onReschedule ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onReschedule(booking)}
            >
              <CalendarClock aria-hidden="true" />
              Reprogramar
            </Button>
          ) : null}
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onCancel(booking)}>
              Cancelar
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
