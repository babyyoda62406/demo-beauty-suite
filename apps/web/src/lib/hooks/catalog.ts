'use client';

/**
 * Capa de datos del catálogo de servicios (SPEC §6/§9 — CMS de la clienta).
 *
 * Rutas EXACTAS (ver `apps/api/src/modules/catalog/*.controller.ts`):
 *   GET    /services           → listado paginado (admin) `OWNER|MANAGER|EMPLOYEE`
 *   POST   /services           → alta            `OWNER|MANAGER`
 *   PATCH  /services/:id        → edición / archivar (toggle `active`)
 *   DELETE /services/:id        → baja
 *   GET    /service-categories  → categorías del salón
 *
 * Todas las llamadas del navegador pasan por el proxy BFF (`apiClient`).
 */
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { PaginatedResult, PaginationQuery } from '@fgd/types';
import { apiClient, ApiClientError, useApiQuery } from './use-api';

/** Servicio del catálogo (tal y como lo serializa la API). Dinero en céntimos. */
export interface Service {
  id: string;
  tenantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  tagline: string | null;
  durationMin: number;
  price: number;
  currency: string;
  active: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Categoría de servicios del salón. */
export interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload de alta/edición de servicio (campos opcionales omitidos). El precio
 * viaja en céntimos y `categoryId` puede ser `null` para dejarlo sin categoría.
 */
export interface ServiceInput {
  name: string;
  tagline?: string | undefined;
  description?: string | undefined;
  price: number;
  durationMin: number;
  categoryId?: string | null | undefined;
  active?: boolean | undefined;
  imageUrl?: string | undefined;
}

export const catalogKeys = {
  all: ['catalog'] as const,
  services: () => [...catalogKeys.all, 'services'] as const,
  serviceList: (params: PaginationQuery) => [...catalogKeys.services(), params] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
};

/** Listado paginado de servicios (panel). Por defecto trae una página amplia. */
export function useServicesAdmin(params: PaginationQuery = {}) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
  };
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;

  return useApiQuery<PaginatedResult<Service>>(catalogKeys.serviceList(params), 'services', {
    query,
    placeholderData: keepPreviousData,
  });
}

/** Categorías de servicios del salón (para el selector del formulario). */
export function useServiceCategories() {
  return useApiQuery<ServiceCategory[]>(catalogKeys.categories(), 'service-categories');
}

function invalidateServices(qc: ReturnType<typeof useQueryClient>): Promise<void> {
  return qc.invalidateQueries({ queryKey: catalogKeys.services() });
}

/** Alta de servicio. */
export function useCreateService(): UseMutationResult<Service, ApiClientError, ServiceInput> {
  const qc = useQueryClient();
  return useMutation<Service, ApiClientError, ServiceInput>({
    mutationFn: (input) => apiClient.post<Service>('services', input),
    onSuccess: () => invalidateServices(qc),
  });
}

export interface UpdateServiceVars {
  id: string;
  data: Partial<ServiceInput>;
}

/** Edición de servicio (también sirve para archivar: `{ active: false }`). */
export function useUpdateService(): UseMutationResult<Service, ApiClientError, UpdateServiceVars> {
  const qc = useQueryClient();
  return useMutation<Service, ApiClientError, UpdateServiceVars>({
    mutationFn: ({ id, data }) => apiClient.patch<Service>(`services/${id}`, data),
    onSuccess: () => invalidateServices(qc),
  });
}

/** Baja de servicio. */
export function useDeleteService(): UseMutationResult<void, ApiClientError, string> {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => apiClient.delete<void>(`services/${id}`),
    onSuccess: () => invalidateServices(qc),
  });
}
