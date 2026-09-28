'use client';

/**
 * Capa de datos del perfil de la clienta autenticada (`/portal/perfil`).
 *
 * GAP DE BACKEND (ver informe de la fase): `ClientsController`
 * (`apps/api/src/modules/clients/clients.controller.ts`) no expone un
 * endpoint de auto-servicio para el rol `CLIENT` — `GET/PATCH /clients/:id`
 * está gateado a `OWNER`/`MANAGER`/`EMPLOYEE`. No existe (todavía) un
 * `GET/PATCH /clients/me` análogo al patrón ya usado en
 * `loyalty/me`, `vouchers/me`, `gift-cards/me`, `subscriptions/me` y
 * `tenants/me`.
 *
 * Este hook llama a `clients/me` siguiendo esa misma convención de nombres
 * para que, en cuanto el backend añada las rutas, esta pantalla funcione sin
 * cambios. Hoy, para una sesión con rol `CLIENT`, la llamada devolverá 403
 * (la ruta cae en `@Get(':id')`/`@Patch(':id')` con `id="me"`, gateada a
 * staff). La página maneja ese error con un `ErrorState` explicativo.
 */
import type { UseMutationResult } from '@tanstack/react-query';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient, ApiClientError, useApiQuery } from './use-api';

export interface MyClientProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  allergies: string | null;
  preferences: string | null;
  favoriteColors: string | null;
  loyaltyPoints: number;
}

export interface UpdateMyProfileInput {
  name?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  birthDate?: string;
  allergies?: string;
  preferences?: string;
  favoriteColors?: string;
}

const keys = {
  me: ['client-profile', 'me'] as const,
};

/** Ficha de la clienta autenticada (pendiente de endpoint dedicado en el backend). */
export function useMyProfile() {
  return useApiQuery<MyClientProfile>(keys.me, 'clients/me', {
    retry: false,
  });
}

/** Edición del perfil propio (pendiente de endpoint dedicado en el backend). */
export function useUpdateMyProfile(): UseMutationResult<
  MyClientProfile,
  ApiClientError,
  UpdateMyProfileInput
> {
  const qc = useQueryClient();
  return useMutation<MyClientProfile, ApiClientError, UpdateMyProfileInput>({
    mutationFn: (data) => apiClient.patch<MyClientProfile>('clients/me', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}
