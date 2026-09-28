'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Clock, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatServicePrice } from '@/lib/format';
import { usePublicServices, type PublicService } from '@/lib/hooks/reserva';
import type { BookingFormValues } from './schema';

/** Paso 1 — elegir servicio. */
export function ServiceStep(): React.JSX.Element {
  const { watch, setValue, formState } = useFormContext<BookingFormValues>();
  const selected = watch('serviceId');
  const { data, isLoading, isError, error, refetch } = usePublicServices();

  const choose = (service: PublicService): void => {
    if (service.id === selected) return;
    setValue('serviceId', service.id, { shouldValidate: true, shouldDirty: true });
    // Cambiar de servicio invalida hora/fecha ya elegidas.
    setValue('startAt', '', { shouldValidate: false });
    setValue('date', '', { shouldValidate: false });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aún no hay servicios disponibles"
        description="Vuelve pronto o escríbenos por WhatsApp para reservar tu cita."
      />
    );
  }

  return (
    <div role="radiogroup" aria-label="Servicios" className="grid gap-4 sm:grid-cols-2">
      {data.map((service) => {
        const active = service.id === selected;
        return (
          <button
            key={service.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(service)}
            className={cn(
              'group flex flex-col gap-2 rounded-2xl border bg-surface p-5 text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2',
              active
                ? 'border-brand-400 shadow-glow ring-1 ring-brand-200'
                : 'border-gold/30 hover:border-brand-300 hover:shadow-soft',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold text-ink">{service.name}</h3>
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-sm font-semibold',
                  active ? 'bg-brand-gradient text-white' : 'bg-brand-50 text-brand-700',
                )}
              >
                {formatServicePrice(service.price, service.currency)}
              </span>
            </div>
            {service.description ? (
              <p className="line-clamp-2 text-sm text-ink-soft/75">{service.description}</p>
            ) : null}
            <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft/60">
              <Clock className="size-3.5" aria-hidden="true" />
              {service.durationMin} min
            </span>
          </button>
        );
      })}
      {formState.errors.serviceId ? (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-2">
          {formState.errors.serviceId.message}
        </p>
      ) : null}
    </div>
  );
}
