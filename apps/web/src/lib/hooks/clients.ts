'use client';

/**
 * Capa de datos del CRM de clientas (SPEC §6/§7).
 *
 * Rutas de la API Nest bajo `/api/v1` (ver `clients.controller.ts`):
 *   GET    /clients                 → listado paginado + búsqueda
 *   GET    /clients/:id             → ficha completa (fotos, citas, pagos)
 *   POST   /clients                 → alta
 *   PATCH  /clients/:id             → edición
 *   PATCH  /clients/:id/notes       → notas privadas
 *   POST   /clients/:id/photos      → adjuntar foto
 *   DELETE /clients/:id             → baja
 *   GET    /clients/upcoming-birthdays → cumpleaños próximos
 *
 * Todas las llamadas del navegador pasan por el proxy BFF (`apiRequest`).
 */
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { PaginatedResult, PaginationQuery } from '@fgd/types';
import { apiClient, ApiClientError, useApiQuery } from './use-api';

// -----------------------------------------------------------------------------
// Tipos (contrato JSON: las fechas viajan como strings ISO-8601)
// -----------------------------------------------------------------------------

/** Tipo de foto de la ficha: antes / después / diseño. */
export type PhotoKind = 'BEFORE' | 'AFTER' | 'DESIGN';

/** Registro de clienta (tal y como lo serializa la API). */
export interface Client {
  id: string;
  tenantId: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  allergies: string | null;
  preferences: string | null;
  favoriteColors: string | null;
  notes: string | null;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

/** Foto adjunta a la ficha de una clienta. */
export interface ClientPhoto {
  id: string;
  clientId: string;
  url: string;
  kind: PhotoKind;
  bookingId: string | null;
  createdAt: string;
}

/** Cita embebida en el historial de la ficha (con servicio y profesional). */
export interface ClientBooking {
  id: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  source: string;
  price: number;
  currency: string;
  notes: string | null;
  service: { id: string; name: string; durationMin: number; price: number } | null;
  employee: { id: string; name: string; color: string } | null;
}

/** Pago embebido en el historial de la ficha. */
export interface ClientPayment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  bookingId: string | null;
  createdAt: string;
}

/** Ficha completa: clienta + historial (fotos, citas, pagos). */
export interface ClientWithHistory extends Client {
  photos: ClientPhoto[];
  bookings: ClientBooking[];
  payments: ClientPayment[];
}

/** Cumpleaños próximo calculado por la API. */
export interface UpcomingBirthday {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  birthDate: string;
  nextBirthday: string;
  daysUntil: number;
  turningAge: number;
}

/** Payload de alta/edición de clienta (campos opcionales se omiten). */
export interface ClientInput {
  name: string;
  phone: string;
  email?: string | undefined;
  instagram?: string | undefined;
  birthDate?: string | undefined;
  photoUrl?: string | undefined;
  allergies?: string | undefined;
  preferences?: string | undefined;
  favoriteColors?: string | undefined;
  notes?: string | undefined;
}

/** Payload para adjuntar una foto. */
export interface ClientPhotoInput {
  url: string;
  kind?: PhotoKind;
  bookingId?: string;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (params: PaginationQuery) => [...clientKeys.lists(), params] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
  birthdays: (days: number) => [...clientKeys.all, 'birthdays', days] as const,
};

// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/** Listado paginado de clientas con búsqueda por nombre/teléfono/email. */
export function useClients(params: PaginationQuery = {}) {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  if (params.search) query.search = params.search;

  return useApiQuery<PaginatedResult<Client>>(clientKeys.list(params), 'clients', {
    query,
    placeholderData: keepPreviousData,
  });
}

/** Ficha completa de una clienta (fotos, citas, pagos). */
export function useClient(id: string, enabled = true) {
  return useApiQuery<ClientWithHistory>(clientKeys.detail(id), `clients/${id}`, {
    enabled: enabled && Boolean(id),
  });
}

/** Cumpleaños próximos dentro de la ventana indicada (por defecto 30 días). */
export function useUpcomingBirthdays(days = 30) {
  return useApiQuery<UpcomingBirthday[]>(clientKeys.birthdays(days), 'clients/upcoming-birthdays', {
    query: { days },
  });
}

// -----------------------------------------------------------------------------
// Escrituras
//
// La API usa `forbidNonWhitelisted: true`, por lo que los cuerpos deben
// contener EXACTAMENTE los campos del DTO. Por eso estas mutaciones construyen
// el cuerpo a mano (no reenvían las variables completas) e invalidan la caché
// de forma explícita.
// -----------------------------------------------------------------------------

/** Alta de clienta. Invalida el listado. */
export function useCreateClient(): UseMutationResult<Client, ApiClientError, ClientInput> {
  const qc = useQueryClient();
  return useMutation<Client, ApiClientError, ClientInput>({
    mutationFn: (input) => apiClient.post<Client>('clients', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.lists() }),
  });
}

/** Variables para editar una clienta: id + parcial de datos. */
export interface UpdateClientVars {
  id: string;
  data: Partial<ClientInput>;
}

/** Edición de clienta. Invalida el listado y su ficha. */
export function useUpdateClient(): UseMutationResult<Client, ApiClientError, UpdateClientVars> {
  const qc = useQueryClient();
  return useMutation<Client, ApiClientError, UpdateClientVars>({
    mutationFn: ({ id, data }) => apiClient.patch<Client>(`clients/${id}`, data),
    onSuccess: (_data, { id }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: clientKeys.lists() }),
        qc.invalidateQueries({ queryKey: clientKeys.detail(id) }),
      ]),
  });
}

/** Variables para las notas privadas. */
export interface NotesVars {
  id: string;
  notes: string | null;
}

/** Establece/limpia las notas privadas de una clienta. */
export function useUpdateNotes(): UseMutationResult<Client, ApiClientError, NotesVars> {
  const qc = useQueryClient();
  return useMutation<Client, ApiClientError, NotesVars>({
    mutationFn: ({ id, notes }) => apiClient.patch<Client>(`clients/${id}/notes`, { notes }),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: clientKeys.detail(id) }),
  });
}

/** Variables para adjuntar una foto. */
export interface AddPhotoVars {
  id: string;
  photo: ClientPhotoInput;
}

/** Adjunta una foto (antes/después/diseño) a la ficha. */
export function useAddClientPhoto(): UseMutationResult<ClientPhoto, ApiClientError, AddPhotoVars> {
  const qc = useQueryClient();
  return useMutation<ClientPhoto, ApiClientError, AddPhotoVars>({
    mutationFn: ({ id, photo }) => apiClient.post<ClientPhoto>(`clients/${id}/photos`, photo),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: clientKeys.detail(id) }),
  });
}

/** Baja de clienta. Invalida el listado. */
export function useDeleteClient(): UseMutationResult<void, ApiClientError, string> {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => apiClient.delete<void>(`clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.lists() }),
  });
}
