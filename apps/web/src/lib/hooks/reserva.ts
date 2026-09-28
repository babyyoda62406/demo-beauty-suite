'use client';

/**
 * Capa de datos de la RESERVA PÚBLICA (sin registro).
 *
 * Endpoints públicos consumidos (rutas exactas bajo `/api/v1`, ver controllers):
 *   - `GET  services/public?categoryId`   → servicios activos del salón.
 *   - `GET  employees/public/team`        → equipo reservable.
 *   - `GET  bookings/availability`        → slots libres (serviceId, date, employeeId?).
 *   - `POST bookings`                     → crea la cita PENDING (source PUBLIC).
 *
 * Todas pasan por el proxy BFF (`/api/proxy/...`) que resuelve el tenant por host.
 */
import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useApiQuery, useApiMutation, type ApiClientError } from './use-api';

// -----------------------------------------------------------------------------
// Tipos (espejo de los DTO/entidades del backend)
// -----------------------------------------------------------------------------

/** Servicio público (subconjunto de `Service` expuesto por `services/public`). */
export interface PublicService {
  id: string;
  tenantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  durationMin: number;
  /** Precio en céntimos. */
  price: number;
  currency: string;
  active: boolean;
  imageUrl: string | null;
}

/** Miembro del equipo reservable (`employees/public/team`). */
export interface PublicTeamMember {
  id: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  color: string;
  bio: string | null;
  specialties: string | null;
}

/** Un slot reservable para un servicio en un día. */
export interface AvailabilitySlot {
  /** Inicio del slot (ISO-8601 UTC). */
  startAt: string;
  /** Fin del slot (ISO-8601 UTC). */
  endAt: string;
  /** Profesionales disponibles para este slot. */
  employeeIds: string[];
}

/** Respuesta de disponibilidad para un servicio en un día concreto. */
export interface AvailabilityResponse {
  serviceId: string;
  date: string;
  durationMin: number;
  slots: AvailabilitySlot[];
}

/** Payload de la reserva pública (`CreatePublicBookingDto`). */
export interface CreatePublicBookingInput {
  serviceId: string;
  employeeId?: string;
  /** Inicio de la cita (ISO-8601 UTC). */
  startAt: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

/** Cita creada (subconjunto útil de `Booking`). */
export interface Booking {
  id: string;
  tenantId: string;
  clientId: string;
  employeeId: string | null;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: string;
  source: string;
  price: number;
  currency: string;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const reservaKeys = {
  services: (categoryId?: string) => ['public', 'services', categoryId ?? 'all'] as const,
  team: () => ['public', 'team'] as const,
  availability: (serviceId: string, date: string, employeeId?: string) =>
    ['public', 'availability', serviceId, date, employeeId ?? 'any'] as const,
};

// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/** Servicios activos del salón para el wizard de reserva. */
export function usePublicServices(
  categoryId?: string,
): UseQueryResult<PublicService[], ApiClientError> {
  return useApiQuery<PublicService[]>(
    reservaKeys.services(categoryId),
    'services/public',
    {
      ...(categoryId ? { query: { categoryId } } : {}),
      staleTime: 5 * 60 * 1000,
    },
  );
}

/** Equipo reservable del salón. */
export function usePublicTeam(): UseQueryResult<PublicTeamMember[], ApiClientError> {
  return useApiQuery<PublicTeamMember[]>(reservaKeys.team(), 'employees/public/team', {
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Disponibilidad de slots. Sólo se ejecuta cuando hay `serviceId` y `date`.
 * `employeeId` es opcional: si se omite, la API agrega los slots de todo el equipo.
 */
export function useAvailability(params: {
  serviceId: string | undefined;
  date: string | undefined;
  employeeId?: string | undefined;
  enabled?: boolean;
}): UseQueryResult<AvailabilityResponse, ApiClientError> {
  const { serviceId, date, employeeId, enabled = true } = params;
  const ready = Boolean(serviceId && date) && enabled;

  const query = useMemo(() => {
    const q: Record<string, string> = { serviceId: serviceId ?? '', date: date ?? '' };
    if (employeeId) q.employeeId = employeeId;
    return q;
  }, [serviceId, date, employeeId]);

  return useApiQuery<AvailabilityResponse>(
    reservaKeys.availability(serviceId ?? '', date ?? '', employeeId),
    'bookings/availability',
    {
      query,
      enabled: ready,
      staleTime: 60 * 1000,
    },
  );
}

// -----------------------------------------------------------------------------
// Escritura
// -----------------------------------------------------------------------------

/** Crea la reserva pública (cita PENDING, source PUBLIC). */
export function useCreatePublicBooking() {
  return useApiMutation<Booking, CreatePublicBookingInput>('bookings', 'POST');
}
