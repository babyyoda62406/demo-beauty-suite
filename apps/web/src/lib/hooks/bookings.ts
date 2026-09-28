'use client';

/**
 * Capa de datos de la AGENDA del salón (SPEC §7).
 *
 * Envuelve los endpoints de `bookings.controller` (bajo `/api/v1`, reenviados
 * por el proxy BFF a `/api/proxy/bookings`). Expone lecturas cacheadas de la
 * agenda, la lista de espera y los catálogos auxiliares (profesionales,
 * servicios, clientas) + la máquina de estados de una cita.
 *
 * Recordatorio de contratos:
 *   - GET  bookings?from&to&employeeId&status  → PaginatedResult<AgendaBooking>
 *   - GET  bookings/waitlist                    → PaginatedResult<WaitlistItem>
 *   - POST bookings/manual                      → cita ADMIN (CONFIRMED)
 *   - PATCH bookings/:id/reschedule|confirm|cancel|complete|no-show
 * El backend rechaza campos no declarados (forbidNonWhitelisted), así que cada
 * mutación envía SOLO los campos del DTO correspondiente.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { BookingStatus } from '@fgd/types';
import { apiClient, ApiClientError } from './use-api';
import type { PaginatedResult } from '@fgd/types';

// -----------------------------------------------------------------------------
// Tipos del dominio (proyección devuelta por el BFF)
// -----------------------------------------------------------------------------

export type { BookingStatus };

export interface AgendaBookingClient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export interface AgendaBookingService {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  currency: string;
}

export interface AgendaBookingEmployee {
  id: string;
  name: string;
  color: string;
}

/** Cita enriquecida tal como la sirve la agenda (`BOOKING_INCLUDE`). */
export interface AgendaBooking {
  id: string;
  tenantId: string;
  clientId: string;
  employeeId: string | null;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  source: 'PUBLIC' | 'PORTAL' | 'ADMIN';
  price: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: AgendaBookingClient;
  service: AgendaBookingService;
  employee: AgendaBookingEmployee | null;
}

export interface WaitlistItem {
  id: string;
  clientId: string;
  serviceId: string;
  desiredDate: string;
  status: 'WAITING' | 'NOTIFIED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string };
}

export interface AgendaEmployee {
  id: string;
  name: string;
  color: string;
  active: boolean;
  bookable: boolean;
}

export interface AgendaService {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  currency: string;
  active: boolean;
}

export interface AgendaClientOption {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export interface BookingsRangeParams {
  from: string;
  to: string;
  employeeId?: string | undefined;
  status?: BookingStatus | undefined;
}

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (params: BookingsRangeParams) => [...bookingKeys.lists(), params] as const,
  waitlist: () => [...bookingKeys.all, 'waitlist'] as const,
};

export const agendaCatalogKeys = {
  employees: ['agenda', 'employees'] as const,
  services: ['agenda', 'services'] as const,
  clients: (search: string) => ['agenda', 'clients', search] as const,
};

/** Tamaño de página amplio: la agenda pinta todo el rango de una vez. */
const AGENDA_PAGE_SIZE = 100;

// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/** Carga las citas del rango `[from, to]` (ISO-8601 UTC), opcionalmente filtradas. */
export function useBookings(
  params: BookingsRangeParams,
): UseQueryResult<PaginatedResult<AgendaBooking>, ApiClientError> {
  return useQuery<PaginatedResult<AgendaBooking>, ApiClientError>({
    queryKey: bookingKeys.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResult<AgendaBooking>>('bookings', {
        signal,
        query: {
          from: params.from,
          to: params.to,
          pageSize: AGENDA_PAGE_SIZE,
          sortOrder: 'asc',
          ...(params.employeeId ? { employeeId: params.employeeId } : {}),
          ...(params.status ? { status: params.status } : {}),
        },
      }),
    placeholderData: (prev) => prev,
  });
}

/** Lista de espera del salón (entradas en espera primero por defecto). */
export function useWaitlist(): UseQueryResult<PaginatedResult<WaitlistItem>, ApiClientError> {
  return useQuery<PaginatedResult<WaitlistItem>, ApiClientError>({
    queryKey: bookingKeys.waitlist(),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResult<WaitlistItem>>('bookings/waitlist', {
        signal,
        query: { pageSize: AGENDA_PAGE_SIZE, status: 'WAITING' },
      }),
  });
}

/** Profesionales activos y reservables (filtros + selector del modal). */
export function useAgendaEmployees(): UseQueryResult<AgendaEmployee[], ApiClientError> {
  return useQuery<AgendaEmployee[], ApiClientError>({
    queryKey: agendaCatalogKeys.employees,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<PaginatedResult<AgendaEmployee>>('employees', {
        signal,
        query: { pageSize: AGENDA_PAGE_SIZE, active: true, bookable: true, sortOrder: 'asc' },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Servicios activos disponibles para reservar. */
export function useAgendaServices(): UseQueryResult<AgendaService[], ApiClientError> {
  return useQuery<AgendaService[], ApiClientError>({
    queryKey: agendaCatalogKeys.services,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<PaginatedResult<AgendaService>>('services', {
        signal,
        query: { pageSize: AGENDA_PAGE_SIZE, active: true, sortOrder: 'asc' },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Busca clientas por nombre/teléfono/email para asignarlas a una cita. */
export function useAgendaClients(
  search: string,
): UseQueryResult<AgendaClientOption[], ApiClientError> {
  const term = search.trim();
  return useQuery<AgendaClientOption[], ApiClientError>({
    queryKey: agendaCatalogKeys.clients(term),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<PaginatedResult<AgendaClientOption>>('clients', {
        signal,
        query: { pageSize: 20, ...(term ? { search: term } : {}) },
      });
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

// -----------------------------------------------------------------------------
// Escrituras (máquina de estados) — invalidan la agenda completa
// -----------------------------------------------------------------------------

export interface CreateManualBookingInput {
  clientId: string;
  serviceId: string;
  startAt: string;
  employeeId?: string | undefined;
  notes?: string | undefined;
}

export interface RescheduleBookingInput {
  id: string;
  startAt: string;
  employeeId?: string | undefined;
}

export interface CancelBookingInput {
  id: string;
  reason?: string | undefined;
}

/** Hook genérico para invalidar toda la agenda tras una mutación. */
function useInvalidateAgenda(): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: bookingKeys.all });
}

/** Alta manual de una cita (source ADMIN → CONFIRMED). */
export function useCreateManualBooking(): UseMutationResult<
  AgendaBooking,
  ApiClientError,
  CreateManualBookingInput
> {
  const invalidate = useInvalidateAgenda();
  return useMutation<AgendaBooking, ApiClientError, CreateManualBookingInput>({
    mutationFn: (input) => {
      const body: Record<string, unknown> = {
        clientId: input.clientId,
        serviceId: input.serviceId,
        startAt: input.startAt,
      };
      if (input.employeeId) body.employeeId = input.employeeId;
      if (input.notes) body.notes = input.notes;
      return apiClient.post<AgendaBooking>('bookings/manual', body);
    },
    onSuccess: invalidate,
  });
}

/** Reprograma la cita (drag&drop → nueva fecha/profesional). */
export function useRescheduleBooking(): UseMutationResult<
  AgendaBooking,
  ApiClientError,
  RescheduleBookingInput
> {
  const invalidate = useInvalidateAgenda();
  return useMutation<AgendaBooking, ApiClientError, RescheduleBookingInput>({
    mutationFn: ({ id, startAt, employeeId }) => {
      const body: Record<string, unknown> = { startAt };
      if (employeeId) body.employeeId = employeeId;
      return apiClient.patch<AgendaBooking>(`bookings/${id}/reschedule`, body);
    },
    onSuccess: invalidate,
  });
}

/** Confirma una cita pendiente. */
export function useConfirmBooking(): UseMutationResult<AgendaBooking, ApiClientError, string> {
  const invalidate = useInvalidateAgenda();
  return useMutation<AgendaBooking, ApiClientError, string>({
    mutationFn: (id) => apiClient.patch<AgendaBooking>(`bookings/${id}/confirm`),
    onSuccess: invalidate,
  });
}

/** Cancela una cita (con motivo opcional). */
export function useCancelBooking(): UseMutationResult<
  AgendaBooking,
  ApiClientError,
  CancelBookingInput
> {
  const invalidate = useInvalidateAgenda();
  return useMutation<AgendaBooking, ApiClientError, CancelBookingInput>({
    mutationFn: ({ id, reason }) =>
      apiClient.patch<AgendaBooking>(`bookings/${id}/cancel`, reason ? { reason } : {}),
    onSuccess: invalidate,
  });
}

/** Marca la cita como completada (acumula sello de fidelización). */
export function useCompleteBooking(): UseMutationResult<AgendaBooking, ApiClientError, string> {
  const invalidate = useInvalidateAgenda();
  return useMutation<AgendaBooking, ApiClientError, string>({
    mutationFn: (id) => apiClient.patch<AgendaBooking>(`bookings/${id}/complete`),
    onSuccess: invalidate,
  });
}

/** Marca la cita como no asistida. */
export function useNoShowBooking(): UseMutationResult<AgendaBooking, ApiClientError, string> {
  const invalidate = useInvalidateAgenda();
  return useMutation<AgendaBooking, ApiClientError, string>({
    mutationFn: (id) => apiClient.patch<AgendaBooking>(`bookings/${id}/no-show`),
    onSuccess: invalidate,
  });
}
