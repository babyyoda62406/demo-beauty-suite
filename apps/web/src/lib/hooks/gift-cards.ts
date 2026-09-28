'use client';

/**
 * Tarjetas regalo desde el panel del salón.
 *
 * Rutas reales (apps/api/src/modules/loyalty/gift-cards.controller.ts, bajo
 * /api/v1 vía el proxy):
 *   GET  /gift-cards               → listado paginado
 *   POST /gift-cards               → emitir una tarjeta
 *   GET  /gift-cards/code/:code    → buscarla por su código
 *   POST /gift-cards/:id/redeem    → descontar del saldo
 *   POST /gift-cards/:id/cancel    → anularla
 */
import type { PaginatedResult } from '@fgd/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { useApiMutation, useApiQuery, type ApiClientError } from './use-api';

export type EstadoTarjeta = 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';

export interface TarjetaRegaloApi {
  id: string;
  /** Código corto, el que se teclea en el mostrador. */
  code: string;
  /** Secreto del enlace público; nunca se enseña, solo se usa para el enlace. */
  publicToken: string;
  design: string;
  /** Importe con el que se emitió, en céntimos. */
  initialAmount: number;
  /** Lo que queda por gastar, en céntimos. */
  balance: number;
  currency: string;
  status: EstadoTarjeta;
  /** El «Para:» de la tarjeta. */
  recipientName: string | null;
  /** El «De:» de la tarjeta. */
  senderName: string | null;
  serviceId: string | null;
  service: { id: string; name: string } | null;
  purchasedByClientId: string | null;
  purchasedBy: { id: string; name: string; phone: string | null } | null;
  redeemedByClientId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Un movimiento de saldo: negativo al descontar, positivo al deshacerlo. */
export interface MovimientoTarjeta {
  id: string;
  amount: number;
  balance: number;
  reason: string | null;
  createdAt: string;
}

export interface CrearTarjeta {
  /** En céntimos. Si se regala un servicio, es su precio. */
  initialAmount: number;
  currency?: string;
  code?: string;
  purchasedByClientId?: string;
  recipientName?: string;
  senderName?: string;
  serviceId?: string;
  expiresAt?: string;
  design?: string;
}

export const tarjetasKeys = {
  lista: (params?: unknown) => ['gift-cards', 'list', params ?? {}] as const,
  porCodigo: (code: string) => ['gift-cards', 'code', code] as const,
  movimientos: (id: string) => ['gift-cards', id, 'movimientos'] as const,
};

export function useTarjetasRegalo(
  params: { page?: number; pageSize?: number; status?: EstadoTarjeta } = {},
) {
  return useApiQuery<PaginatedResult<TarjetaRegaloApi>>(tarjetasKeys.lista(params), 'gift-cards', {
    query: params as Record<string, string | number | undefined>,
  }) as UseQueryResult<PaginatedResult<TarjetaRegaloApi>, ApiClientError>;
}

/**
 * Busca una tarjeta por su código.
 *
 * Es lo que resuelve el escaneo del QR: se saca el código del enlace y se
 * consulta aquí. Solo dispara cuando hay algo que buscar.
 */
export function useTarjetaPorCodigo(code: string) {
  return useApiQuery<TarjetaRegaloApi>(
    tarjetasKeys.porCodigo(code),
    `gift-cards/code/${encodeURIComponent(code)}`,
    { enabled: code.trim().length > 0, retry: false },
  ) as UseQueryResult<TarjetaRegaloApi, ApiClientError>;
}

/** Emite una tarjeta: es como la dueña carga el saldo tras cobrarla. */
export function useCrearTarjeta() {
  return useApiMutation<TarjetaRegaloApi, CrearTarjeta>('gift-cards', 'POST', {
    invalidateKeys: [['gift-cards']],
  });
}

/** Descuenta un importe del saldo cuando la clienta la usa. */
export function useDescontarTarjeta() {
  return useApiMutation<
    TarjetaRegaloApi,
    { id: string; amount: number; reason?: string; redeemedByClientId?: string }
  >('gift-cards', 'POST', {
    resolvePath: (v) => `gift-cards/${v.id}/redeem`,
    invalidateKeys: [['gift-cards']],
  });
}

/** Deshace un descuento mal hecho y devuelve el importe al saldo. */
export function useDevolverTarjeta() {
  return useApiMutation<TarjetaRegaloApi, { id: string; amount: number; reason?: string }>(
    'gift-cards',
    'POST',
    {
      resolvePath: (v) => `gift-cards/${v.id}/refund`,
      invalidateKeys: [['gift-cards']],
    },
  );
}

/** Historial de movimientos de una tarjeta. */
export function useMovimientosTarjeta(id: string | undefined) {
  return useApiQuery<MovimientoTarjeta[]>(
    tarjetasKeys.movimientos(id ?? ''),
    `gift-cards/${id ?? ''}/movimientos`,
    { enabled: Boolean(id) },
  ) as UseQueryResult<MovimientoTarjeta[], ApiClientError>;
}

/** Anula una tarjeta (ya no se puede usar). */
export function useAnularTarjeta() {
  return useApiMutation<TarjetaRegaloApi, { id: string }>('gift-cards', 'POST', {
    resolvePath: (v) => `gift-cards/${v.id}/cancel`,
    invalidateKeys: [['gift-cards']],
  });
}
