'use client';

/**
 * Fidelización desde el panel del salón.
 *
 * Rutas reales (apps/api/src/modules/loyalty/loyalty.controller.ts, bajo
 * /api/v1 vía el proxy):
 *   GET  /loyalty/cards                → tarjetas del salón
 *   POST /loyalty/cards                → crear la tarjeta de una clienta
 *   POST /loyalty/cards/:id/stamp      → sellar
 *   POST /loyalty/cards/:id/unstamp    → deshacer un sello
 *   POST /loyalty/cards/:id/redeem     → canjear un premio
 */
import type { PaginatedResult } from '@fgd/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { useApiMutation, useApiQuery, type ApiClientError } from './use-api';

/** Sellos que completan una tarjeta (debe coincidir con STAMPS_PER_REWARD). */
export const SELLOS_POR_PREMIO = 10;

export interface LoyaltyCard {
  id: string;
  clientId: string;
  /** Sellos de la tarjeta en curso (0…9). */
  stamps: number;
  /** Premios ganados y aún sin canjear. */
  freeEarned: number;
  /** Premios ya entregados. */
  redeemedCount: number;
  updatedAt: string;
  client?: { id: string; name: string; phone?: string | null } | null;
}

export const loyaltyKeys = {
  cards: (params?: unknown) => ['loyalty', 'cards', params ?? {}] as const,
};

export function useLoyaltyCards(params: { page?: number; pageSize?: number; search?: string } = {}) {
  return useApiQuery<PaginatedResult<LoyaltyCard>>(loyaltyKeys.cards(params), 'loyalty/cards', {
    query: params as Record<string, string | number | undefined>,
  }) as UseQueryResult<PaginatedResult<LoyaltyCard>, ApiClientError>;
}

/** Añade un sello (o varios) a una tarjeta. */
export function useAddStamp() {
  return useApiMutation<LoyaltyCard, { id: string; count?: number; reason?: string }>(
    'loyalty/cards',
    'POST',
    {
      resolvePath: (v) => `loyalty/cards/${v.id}/stamp`,
      invalidateKeys: [['loyalty', 'cards']],
    },
  );
}

/** Deshace el último sello (por si se ha puesto por error). */
export function useRemoveStamp() {
  return useApiMutation<LoyaltyCard, { id: string }>('loyalty/cards', 'POST', {
    resolvePath: (v) => `loyalty/cards/${v.id}/unstamp`,
    invalidateKeys: [['loyalty', 'cards']],
  });
}

/** Entrega un premio ganado. */
export function useRedeemReward() {
  return useApiMutation<LoyaltyCard, { id: string; reason?: string }>('loyalty/cards', 'POST', {
    resolvePath: (v) => `loyalty/cards/${v.id}/redeem`,
    invalidateKeys: [['loyalty', 'cards']],
  });
}

/** Crea la tarjeta de una clienta que aún no la tiene. */
export function useCreateCard() {
  return useApiMutation<LoyaltyCard, { clientId: string }>('loyalty/cards', 'POST', {
    invalidateKeys: [['loyalty', 'cards']],
  });
}
