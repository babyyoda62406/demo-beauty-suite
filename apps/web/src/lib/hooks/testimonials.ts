'use client';

/**
 * Capa de datos de testimonios / opiniones (SPEC §6/§9 — CMS de la clienta).
 *
 * Rutas EXACTAS (ver `apps/api/src/modules/content/testimonials.controller.ts`):
 *   GET    /content/testimonials/manage    → listado paginado (incluye pendientes)
 *   POST   /content/testimonials           → alta
 *   PATCH  /content/testimonials/:id        → edición
 *   PATCH  /content/testimonials/:id/approval → aprobar / ocultar (`{ approved }`)
 *   DELETE /content/testimonials/:id        → baja
 */
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { PaginatedResult, PaginationQuery } from '@fgd/types';
import { apiClient, ApiClientError, useApiQuery } from './use-api';

/** Testimonio (tal y como lo serializa la API). */
export interface Testimonial {
  id: string;
  tenantId: string;
  clientName: string;
  rating: number;
  text: string;
  avatarUrl: string | null;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload de alta/edición de testimonio. */
export interface TestimonialInput {
  clientName: string;
  rating: number;
  text: string;
  approved?: boolean | undefined;
}

export const testimonialKeys = {
  all: ['testimonials'] as const,
  lists: () => [...testimonialKeys.all, 'manage'] as const,
  list: (params: PaginationQuery) => [...testimonialKeys.lists(), params] as const,
};

/** Listado paginado de testimonios (panel), incluye pendientes de aprobar. */
export function useTestimonialsAdmin(params: PaginationQuery = {}) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
  };
  return useApiQuery<PaginatedResult<Testimonial>>(
    testimonialKeys.list(params),
    'content/testimonials/manage',
    { query, placeholderData: keepPreviousData },
  );
}

function invalidate(qc: ReturnType<typeof useQueryClient>): Promise<void> {
  return qc.invalidateQueries({ queryKey: testimonialKeys.lists() });
}

/** Alta de testimonio. */
export function useCreateTestimonial(): UseMutationResult<
  Testimonial,
  ApiClientError,
  TestimonialInput
> {
  const qc = useQueryClient();
  return useMutation<Testimonial, ApiClientError, TestimonialInput>({
    mutationFn: (input) => apiClient.post<Testimonial>('content/testimonials', input),
    onSuccess: () => invalidate(qc),
  });
}

export interface UpdateTestimonialVars {
  id: string;
  data: Partial<TestimonialInput>;
}

/** Edición de testimonio. */
export function useUpdateTestimonial(): UseMutationResult<
  Testimonial,
  ApiClientError,
  UpdateTestimonialVars
> {
  const qc = useQueryClient();
  return useMutation<Testimonial, ApiClientError, UpdateTestimonialVars>({
    mutationFn: ({ id, data }) => apiClient.patch<Testimonial>(`content/testimonials/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}

export interface ApproveTestimonialVars {
  id: string;
  approved: boolean;
}

/** Aprueba u oculta un testimonio (endpoint dedicado `/approval`). */
export function useApproveTestimonial(): UseMutationResult<
  Testimonial,
  ApiClientError,
  ApproveTestimonialVars
> {
  const qc = useQueryClient();
  return useMutation<Testimonial, ApiClientError, ApproveTestimonialVars>({
    mutationFn: ({ id, approved }) =>
      apiClient.patch<Testimonial>(`content/testimonials/${id}/approval`, { approved }),
    onSuccess: () => invalidate(qc),
  });
}

/** Baja de testimonio. */
export function useDeleteTestimonial(): UseMutationResult<void, ApiClientError, string> {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => apiClient.delete<void>(`content/testimonials/${id}`),
    onSuccess: () => invalidate(qc),
  });
}
