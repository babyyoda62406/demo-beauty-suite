'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { CalendarDays, Clock, Scissors, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatServicePrice, formatDate, formatTime, formatWeekday } from '@/lib/format';
import { usePublicServices, usePublicTeam } from '@/lib/hooks/reserva';
import type { BookingFormValues } from './schema';

interface SummaryProps {
  /** `aside`: tarjeta lateral pegajosa. `review`: bloque de repaso en el paso final. */
  variant?: 'aside' | 'review';
  className?: string;
}

interface Row {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  muted?: boolean;
}

/** Resumen de la reserva en construcción, derivado del formulario + cachés. */
export function BookingSummary({ variant = 'aside', className }: SummaryProps): React.JSX.Element {
  const { watch } = useFormContext<BookingFormValues>();
  const serviceId = watch('serviceId');
  const employeeId = watch('employeeId') ?? '';
  const date = watch('date');
  const startAt = watch('startAt');

  const { data: services } = usePublicServices();
  const { data: team } = usePublicTeam();

  const service = services?.find((s) => s.id === serviceId);
  const member = employeeId ? team?.find((m) => m.id === employeeId) : undefined;

  const rows: Row[] = [
    {
      icon: Scissors,
      label: 'Servicio',
      value: service?.name ?? 'Por elegir',
      muted: !service,
    },
    {
      icon: User,
      label: 'Profesional',
      value: member ? member.name : 'Cualquier profesional',
      muted: false,
    },
    {
      icon: CalendarDays,
      label: 'Fecha',
      value: date ? `${formatWeekday(date)}, ${formatDate(date, "d 'de' MMMM")}` : 'Por elegir',
      muted: !date,
    },
    {
      icon: Clock,
      label: 'Hora',
      value: startAt ? `${formatTime(startAt)} h` : 'Por elegir',
      muted: !startAt,
    },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border border-gold/30 bg-surface shadow-card',
        className,
      )}
    >
      <div className="relative overflow-hidden bg-brand-gradient px-6 py-5 text-white">
        <Sparkles className="pointer-events-none absolute -right-3 -top-3 size-20 opacity-20" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          {variant === 'review' ? 'Repasa tu cita' : 'Tu reserva'}
        </p>
        <p className="mt-1 font-serif text-xl font-bold">Estudio Aurora</p>
      </div>

      <dl className="divide-y divide-gold/20 px-6 py-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-deep text-brand-600">
              <row.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft/55">
                {row.label}
              </dt>
              <dd
                className={cn(
                  'truncate text-sm font-semibold',
                  row.muted ? 'text-ink-soft/50' : 'text-ink',
                )}
              >
                {row.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between border-t border-gold/25 bg-cream-deep px-6 py-4">
        <span className="text-sm font-medium text-ink-soft/80">Total estimado</span>
        <span className="font-serif text-xl font-bold text-brand-700">
          {service ? formatServicePrice(service.price, service.currency) : '—'}
        </span>
      </div>
    </div>
  );
}
