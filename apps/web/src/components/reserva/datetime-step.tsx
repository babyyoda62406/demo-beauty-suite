'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { addDays, format, isToday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarX2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format';
import { useAvailability, type AvailabilitySlot } from '@/lib/hooks/reserva';
import type { BookingFormValues } from './schema';

/** Nº de días ofrecidos a partir de hoy. */
const DAYS_AHEAD = 21;

/** Paso 3 — elegir día y hora entre la disponibilidad real. */
export function DateTimeStep(): React.JSX.Element {
  const { watch, setValue, formState } = useFormContext<BookingFormValues>();
  const serviceId = watch('serviceId');
  const employeeId = watch('employeeId') || undefined;
  const date = watch('date');
  const startAt = watch('startAt');

  const days = React.useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(base, i));
  }, []);

  const selectDay = (day: Date): void => {
    const value = format(day, 'yyyy-MM-dd');
    if (value === date) return;
    setValue('date', value, { shouldValidate: true, shouldDirty: true });
    setValue('startAt', '', { shouldValidate: false });
  };

  const selectSlot = (slot: AvailabilitySlot): void => {
    setValue('startAt', slot.startAt, { shouldValidate: true, shouldDirty: true });
  };

  const { data, isLoading, isFetching, isError, error, refetch } = useAvailability({
    serviceId,
    date: date || undefined,
    employeeId,
  });

  const slots = data?.slots ?? [];

  return (
    <div className="space-y-6">
      {/* Selector de día */}
      <div>
        <p className="mb-3 text-sm font-medium text-ink-soft/80">Elige un día</p>
        <div className="flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="Días">
          {days.map((day) => {
            const value = format(day, 'yyyy-MM-dd');
            const active = value === date;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectDay(day)}
                className={cn(
                  'flex min-w-[3.75rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2',
                  active
                    ? 'border-brand-400 bg-brand-gradient text-white shadow-glow'
                    : 'border-gold/30 bg-surface text-ink hover:border-brand-300 hover:shadow-soft',
                )}
              >
                <span
                  className={cn(
                    'text-[0.65rem] font-semibold uppercase tracking-wide',
                    active ? 'text-white/80' : 'text-ink-soft/55',
                  )}
                >
                  {isToday(day) ? 'Hoy' : format(day, 'EEE', { locale: es })}
                </span>
                <span className="text-lg font-bold leading-none">{format(day, 'd')}</span>
                <span
                  className={cn(
                    'text-[0.65rem] font-medium',
                    active ? 'text-white/80' : 'text-ink-soft/55',
                  )}
                >
                  {format(day, 'MMM', { locale: es })}
                </span>
              </button>
            );
          })}
        </div>
        {formState.errors.date ? (
          <p role="alert" className="mt-1 text-sm font-medium text-danger">
            {formState.errors.date.message}
          </p>
        ) : null}
      </div>

      {/* Slots */}
      <div>
        <p className="mb-3 text-sm font-medium text-ink-soft/80">Elige una hora</p>

        {!date ? (
          <p className="rounded-2xl border border-dashed border-gold/40 bg-cream-deep/50 px-4 py-8 text-center text-sm text-ink-soft/70">
            Selecciona primero un día para ver las horas disponibles.
          </p>
        ) : isLoading || isFetching ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gold/40 bg-cream-deep/50 px-4 py-10 text-center">
            <CalendarX2 className="size-6 text-brand-400" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">No hay horas libres este día</p>
            <p className="text-sm text-ink-soft/70">Prueba con otro día del calendario.</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            role="radiogroup"
            aria-label="Horas disponibles"
          >
            {slots.map((slot) => {
              const active = slot.startAt === startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectSlot(slot)}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2',
                    active
                      ? 'border-brand-400 bg-brand-gradient text-white shadow-glow'
                      : 'border-gold/30 bg-surface text-ink hover:border-brand-300 hover:shadow-soft',
                  )}
                >
                  <Clock className="size-3.5 opacity-70" aria-hidden="true" />
                  {formatTime(slot.startAt)}
                </button>
              );
            })}
          </div>
        )}

        {formState.errors.startAt && date ? (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {formState.errors.startAt.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Reexport para conveniencia de tipos en consumidores. */
export type { AvailabilitySlot };
