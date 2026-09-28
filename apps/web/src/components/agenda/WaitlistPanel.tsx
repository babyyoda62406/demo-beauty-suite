'use client';

/**
 * Panel lateral de Lista de espera: clientas esperando hueco para un servicio.
 * Estados de carga/vacío/error propios. Sólo lectura (la conversión a cita se
 * hace desde el flujo de reserva).
 */
import * as React from 'react';
import { CalendarHeart, Loader2, Phone } from 'lucide-react';
import { Card } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/common';
import { formatDateShort } from '@/lib/format';
import { useWaitlist } from '@/lib/hooks/bookings';

export function WaitlistPanel(): React.JSX.Element {
  const { data, isLoading, isError, error, refetch } = useWaitlist();
  const entries = data?.data ?? [];

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-brand-100/70 bg-surface-subtle/60 px-4 py-3">
        <h2 className="flex items-center gap-2 font-serif text-base font-semibold text-ink">
          <CalendarHeart className="size-4 text-brand-500" aria-hidden="true" />
          Lista de espera
        </h2>
        {entries.length > 0 ? (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
            {entries.length}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft/70">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando…
          </p>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} className="py-8" />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={CalendarHeart}
            title="Sin lista de espera"
            description="Cuando una clienta se apunte a un servicio sin hueco, aparecerá aquí."
            className="py-8"
          />
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-brand-100 bg-white p-3 transition-colors hover:border-brand-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium text-ink">{entry.client.name}</p>
                  <span className="shrink-0 text-xs text-ink-soft/60">
                    {formatDateShort(entry.desiredDate)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-brand-600">{entry.service.name}</p>
                <a
                  href={`tel:${entry.client.phone}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-soft/70 transition-colors hover:text-brand-600"
                >
                  <Phone className="size-3.5" aria-hidden="true" />
                  {entry.client.phone}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
