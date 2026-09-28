'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Sparkles, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/common';
import { cn } from '@/lib/utils';
import { usePublicTeam, type PublicTeamMember } from '@/lib/hooks/reserva';
import type { BookingFormValues } from './schema';
import { mediaUrl } from '@/lib/media';

/** Iniciales para el avatar de reserva. */
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Paso 2 — elegir profesional (o «cualquiera»). */
export function ProfessionalStep(): React.JSX.Element {
  const { watch, setValue } = useFormContext<BookingFormValues>();
  const selected = watch('employeeId') ?? '';
  const { data, isLoading, isError, error, refetch } = usePublicTeam();

  const choose = (id: string): void => {
    if (id === selected) return;
    setValue('employeeId', id, { shouldDirty: true });
    // Cambiar de profesional invalida la hora ya elegida (otra disponibilidad).
    setValue('startAt', '', { shouldValidate: false });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  const team: PublicTeamMember[] = data ?? [];

  if (team.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="El equipo aún no está disponible"
        description="Puedes continuar con «cualquier profesional» y te asignaremos a la mejor persona."
      />
    );
  }

  const anyActive = selected === '';

  return (
    <div role="radiogroup" aria-label="Profesionales" className="grid gap-4 sm:grid-cols-2">
      {/* Opción: cualquier profesional */}
      <button
        type="button"
        role="radio"
        aria-checked={anyActive}
        onClick={() => choose('')}
        className={cn(
          'flex items-center gap-4 rounded-2xl border bg-surface p-4 text-left transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2',
          anyActive
            ? 'border-brand-400 shadow-glow ring-1 ring-brand-200'
            : 'border-gold/30 hover:border-brand-300 hover:shadow-soft',
        )}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-base font-semibold text-ink">
            Cualquier profesional
          </span>
          <span className="block text-sm text-ink-soft/70">
            Te asignamos la primera disponibilidad
          </span>
        </span>
      </button>

      {team.map((member) => {
        const active = member.id === selected;
        return (
          <button
            key={member.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(member.id)}
            className={cn(
              'flex items-center gap-4 rounded-2xl border bg-surface p-4 text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2',
              active
                ? 'border-brand-400 shadow-glow ring-1 ring-brand-200'
                : 'border-gold/30 hover:border-brand-300 hover:shadow-soft',
            )}
          >
            <Avatar className="size-12 shrink-0 border border-gold/30">
              {member.photoUrl ? (
                <AvatarImage src={mediaUrl(member.photoUrl)} alt={member.name} />
              ) : null}
              <AvatarFallback
                style={{ backgroundColor: member.color }}
                className="text-sm font-semibold text-white"
              >
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate font-serif text-base font-semibold text-ink">
                {member.name}
              </span>
              {member.title ? (
                <span className="block truncate text-sm text-ink-soft/70">{member.title}</span>
              ) : null}
              {member.specialties ? (
                <span className="mt-0.5 block truncate text-xs text-brand-600">
                  {member.specialties}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
