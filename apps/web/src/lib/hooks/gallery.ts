'use client';

/**
 * Capa de datos de la Galería del salón (SPEC §9 `content/gallery`).
 *
 * Ruta exacta verificada en `apps/api/src/modules/content/gallery.controller.ts`:
 *   GET /content/gallery → galería pública del salón, `@Public()`, con filtros
 *   opcionales `category` / `isBeforeAfter`.
 *
 * NOTA (gap de backend, ver informe de la fase): no existe un endpoint
 * `clients/me/photos` (ni `clients/:id/photos` accesible a rol `CLIENT`, que
 * está gateado a `OWNER`/`MANAGER`). Por eso "Mis fotos" usa aquí la galería
 * pública de antes/después del salón (la misma que alimenta la web pública),
 * no un recorte por clienta. En cuanto exista un endpoint de fotos propio de
 * la clienta, sustituir este hook por uno equivalente sin tocar la página.
 */
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { PaginatedResult, PaginationQuery } from '@fgd/types';
import { apiClient, ApiClientError, useApiQuery } from './use-api';

export interface GalleryItem {
  id: string;
  tenantId: string;
  url: string;
  category: string | null;
  isBeforeAfter: boolean;
  beforeUrl: string | null;
  afterUrl: string | null;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicGalleryParams {
  category?: string;
  isBeforeAfter?: boolean;
}

const keys = {
  public: (params: PublicGalleryParams = {}) => ['gallery', 'public', params] as const,
};

/** Galería pública del salón (uso: `/portal/fotos`, web pública). */
export function usePublicGallery(params: PublicGalleryParams = {}) {
  return useApiQuery<GalleryItem[]>(keys.public(params), 'content/gallery', {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

// -----------------------------------------------------------------------------
// Administración de la galería (CMS de la clienta — SPEC §9).
//
// Rutas EXACTAS (ver `apps/api/src/modules/content/gallery.controller.ts`):
//   GET    /content/gallery/manage   → listado paginado (admin)
//   POST   /content/gallery          → alta (subida ya hecha por ImageUpload)
//   PATCH  /content/gallery/:id       → edición
//   DELETE /content/gallery/:id       → baja
// -----------------------------------------------------------------------------

/** Payload de alta de un elemento de galería (foto simple). */
export interface GalleryItemInput {
  url: string;
  category?: string | undefined;
  caption?: string | undefined;
  isBeforeAfter?: boolean | undefined;
  beforeUrl?: string | undefined;
  afterUrl?: string | undefined;
  sortOrder?: number | undefined;
}

export const galleryKeys = {
  all: ['gallery'] as const,
  manage: () => [...galleryKeys.all, 'manage'] as const,
  manageList: (params: PaginationQuery) => [...galleryKeys.manage(), params] as const,
};

/** Listado paginado de la galería (panel). */
export function useGalleryManage(params: PaginationQuery = {}) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
  };
  return useApiQuery<PaginatedResult<GalleryItem>>(
    galleryKeys.manageList(params),
    'content/gallery/manage',
    { query, placeholderData: keepPreviousData },
  );
}

function invalidateGallery(qc: ReturnType<typeof useQueryClient>): Promise<void> {
  return qc.invalidateQueries({ queryKey: galleryKeys.all });
}

/** Alta de un elemento de galería. */
export function useCreateGalleryItem(): UseMutationResult<
  GalleryItem,
  ApiClientError,
  GalleryItemInput
> {
  const qc = useQueryClient();
  return useMutation<GalleryItem, ApiClientError, GalleryItemInput>({
    mutationFn: (input) => apiClient.post<GalleryItem>('content/gallery', input),
    onSuccess: () => invalidateGallery(qc),
  });
}

export interface UpdateGalleryVars {
  id: string;
  data: Partial<GalleryItemInput>;
}

/** Edición de un elemento de galería. */
export function useUpdateGalleryItem(): UseMutationResult<
  GalleryItem,
  ApiClientError,
  UpdateGalleryVars
> {
  const qc = useQueryClient();
  return useMutation<GalleryItem, ApiClientError, UpdateGalleryVars>({
    mutationFn: ({ id, data }) => apiClient.patch<GalleryItem>(`content/gallery/${id}`, data),
    onSuccess: () => invalidateGallery(qc),
  });
}

/** Baja de un elemento de galería. */
export function useDeleteGalleryItem(): UseMutationResult<void, ApiClientError, string> {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => apiClient.delete<void>(`content/gallery/${id}`),
    onSuccess: () => invalidateGallery(qc),
  });
}
