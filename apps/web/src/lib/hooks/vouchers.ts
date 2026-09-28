'use client';

/**
 * Bonos de sesiones desde el panel del salón.
 *
 * Rutas reales (apps/api/src/modules/loyalty/vouchers.controller.ts, bajo
 * /api/v1 vía el proxy):
 *   GET  /vouchers              → listado paginado
 *   POST /vouchers              → dar de alta un bono ya pagado
 *   POST /vouchers/:id/consume  → gastar una sesión
 *   POST /vouchers/:id/cancel   → anularlo
 */
import type { PaginatedResult } from '@fgd/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { useApiMutation, useApiQuery, type ApiClientError } from './use-api';

export type EstadoBono = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface BonoApi {
  id: string;
  clientId: string;
  serviceId: string | null;
  totalSessions: number;
  usedSessions: number;
  /** Sesiones que quedan; la calcula el API. */
  remainingSessions?: number;
  /** Precio pagado, en céntimos. */
  price: number;
  currency: string;
  status: EstadoBono;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string; phone?: string | null } | null;
}

export interface CrearBono {
  clientId: string;
  totalSessions: number;
  /** En céntimos. */
  price: number;
  serviceId?: string | null;
  currency?: string;
  expiresAt?: string;
}

export const bonosKeys = {
  lista: (params?: unknown) => ['vouchers', 'list', params ?? {}] as const,
};

export function useBonos(params: { page?: number; pageSize?: number; status?: EstadoBono } = {}) {
  return useApiQuery<PaginatedResult<BonoApi>>(bonosKeys.lista(params), 'vouchers', {
    query: params as Record<string, string | number | undefined>,
  }) as UseQueryResult<PaginatedResult<BonoApi>, ApiClientError>;
}

/** Da de alta un bono ya cobrado: así es como la dueña le carga el crédito. */
export function useCrearBono() {
  return useApiMutation<BonoApi, CrearBono>('vouchers', 'POST', {
    invalidateKeys: [['vouchers']],
  });
}

/** Gasta una sesión del bono. */
export function useConsumirBono() {
  return useApiMutation<BonoApi, { id: string }>('vouchers', 'POST', {
    resolvePath: (v) => `vouchers/${v.id}/consume`,
    invalidateKeys: [['vouchers']],
  });
}

/** Anula un bono. */
export function useAnularBono() {
  return useApiMutation<BonoApi, { id: string }>('vouchers', 'POST', {
    resolvePath: (v) => `vouchers/${v.id}/cancel`,
    invalidateKeys: [['vouchers']],
  });
}
