'use client';

/**
 * Capa de datos del PORTAL DE LA CLIENTA (SPEC §4/§9).
 *
 * Envuelve los endpoints que el backend expone con `@Roles('CLIENT')` para que
 * la clienta autenticada consulte SOLO lo suyo. Todas las llamadas del navegador
 * pasan por el proxy BFF (`/api/proxy/<path>` → `/api/v1/<path>` con la cookie
 * de sesión). Rutas exactas verificadas en los controllers:
 *
 *   - GET  loyalty/me     → LoyaltyCardWithTransactions   (loyalty.controller)
 *   - GET  vouchers/me    → VoucherWithBalance[]           (vouchers.controller)
 *   - GET  gift-cards/me  → GiftCard[]                     (gift-cards.controller)
 *
 * Citas de la clienta
 * -------------------
 * El backend todavía NO publica un listado propio de citas para el rol CLIENT
 * (el `GET /bookings` actual es sólo de staff). Seguimos la MISMA convención que
 * el resto del portal (`/loyalty/me`, `/vouchers/me`, `/gift-cards/me`) y
 * consumimos `GET bookings/me`. Mientras el endpoint no exista, la vista degrada
 * con su estado de error/vacío (no rompe). Las transiciones de estado
 * (cancelar / reprogramar) sí existen como rutas (`PATCH bookings/:id/cancel` y
 * `.../reschedule`) y las reutilizamos tal cual.
 *
 * DEPENDENCIA BACKEND (pendiente): añadir `@Roles('CLIENT') GET /bookings/me` y
 * permitir CLIENT en `cancel`/`reschedule` sobre citas propias.
 */
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { PaginatedResult } from '@fgd/types';
import { apiClient, useApiQuery, type ApiClientError } from './use-api';
import type { AgendaBooking } from './bookings';

export type { AgendaBooking };

// -----------------------------------------------------------------------------
// Tipos del dominio (espejo de las entidades Prisma servidas por la API)
// -----------------------------------------------------------------------------

/** Movimiento de la tarjeta de fidelización (sello ganado / canje). */
export interface LoyaltyTransaction {
  id: string;
  cardId: string;
  bookingId: string | null;
  /** Positivo = sellos ganados; negativo = recompensa canjeada. */
  delta: number;
  reason: string;
  createdAt: string;
}

/** Tarjeta de fidelización de la clienta (10 sellos → 1 recompensa gratis). */
export interface LoyaltyCard {
  id: string;
  tenantId: string;
  clientId: string;
  /** Sellos acumulados en el ciclo actual (0–9). */
  stamps: number;
  /** Recompensas gratuitas disponibles para canjear. */
  freeEarned: number;
  /** Recompensas ya canjeadas históricamente. */
  redeemedCount: number;
  createdAt: string;
  updatedAt: string;
  transactions: LoyaltyTransaction[];
}

export type VoucherStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

/** Bono de sesiones prepagadas con su saldo derivado. */
export interface Voucher {
  id: string;
  tenantId: string;
  clientId: string;
  serviceId: string | null;
  totalSessions: number;
  usedSessions: number;
  /** Precio pagado, en céntimos. */
  price: number;
  currency: string;
  expiresAt: string | null;
  status: VoucherStatus;
  createdAt: string;
  updatedAt: string;
  /** Sesiones que quedan por usar (`total - usadas`). */
  remainingSessions: number;
}

export type GiftCardStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';

/** Tarjeta regalo con saldo en céntimos. */
export interface GiftCard {
  id: string;
  tenantId: string;
  code: string;
  /** Importe inicial, en céntimos. */
  initialAmount: number;
  /** Saldo restante, en céntimos. */
  balance: number;
  currency: string;
  purchasedByClientId: string | null;
  redeemedByClientId: string | null;
  status: GiftCardStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Nº de sellos necesarios para una recompensa gratis (SPEC — fidelización). */
export const STAMPS_PER_REWARD = 10;

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const portalKeys = {
  all: ['portal'] as const,
  loyalty: ['portal', 'loyalty'] as const,
  vouchers: ['portal', 'vouchers'] as const,
  giftCards: ['portal', 'gift-cards'] as const,
  bookings: ['portal', 'bookings'] as const,
};

/** Página amplia: el portal pinta todas las citas de una vez y filtra en cliente. */
const PORTAL_PAGE_SIZE = 100;

// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/** Tarjeta de fidelización de la clienta autenticada (`GET loyalty/me`). */
export function useMyLoyaltyCard(): UseQueryResult<LoyaltyCard, ApiClientError> {
  return useApiQuery<LoyaltyCard>(portalKeys.loyalty, 'loyalty/me', {
    staleTime: 60 * 1000,
  });
}

/** Bonos de la clienta con su saldo de sesiones (`GET vouchers/me`). */
export function useMyVouchers(): UseQueryResult<Voucher[], ApiClientError> {
  return useApiQuery<Voucher[]>(portalKeys.vouchers, 'vouchers/me', {
    staleTime: 60 * 1000,
  });
}

/** Tarjetas regalo compradas por la clienta (`GET gift-cards/me`). */
export function useMyGiftCards(): UseQueryResult<GiftCard[], ApiClientError> {
  return useApiQuery<GiftCard[]>(portalKeys.giftCards, 'gift-cards/me', {
    staleTime: 60 * 1000,
  });
}

/**
 * Citas de la clienta autenticada (`GET bookings/me`, ver nota de dependencia).
 * Devuelve el resultado paginado enriquecido igual que la agenda del salón.
 */
export function useMyBookings(): UseQueryResult<
  PaginatedResult<AgendaBooking>,
  ApiClientError
> {
  return useApiQuery<PaginatedResult<AgendaBooking>>(portalKeys.bookings, 'bookings/me', {
    query: { pageSize: PORTAL_PAGE_SIZE, sortOrder: 'desc' },
    staleTime: 30 * 1000,
  });
}

// -----------------------------------------------------------------------------
// Escrituras (transiciones de estado de una cita propia)
// -----------------------------------------------------------------------------

export interface CancelMyBookingInput {
  id: string;
  reason?: string | undefined;
}

export interface RescheduleMyBookingInput {
  id: string;
  /** Nuevo inicio de la cita (ISO-8601 UTC). */
  startAt: string;
  employeeId?: string | undefined;
}

/**
 * Cancela una cita propia (`PATCH bookings/:id/cancel`). El `id` viaja en la
 * ruta —nunca en el body— porque el backend rechaza campos no declarados
 * (`forbidNonWhitelisted`).
 */
export function useCancelMyBooking(): UseMutationResult<
  AgendaBooking,
  ApiClientError,
  CancelMyBookingInput
> {
  const queryClient = useQueryClient();
  return useMutation<AgendaBooking, ApiClientError, CancelMyBookingInput>({
    mutationFn: ({ id, reason }) =>
      apiClient.patch<AgendaBooking>(
        `bookings/${id}/cancel`,
        reason && reason.trim() ? { reason: reason.trim() } : {},
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portalKeys.bookings }),
  });
}

/** Reprograma una cita propia (`PATCH bookings/:id/reschedule`). */
export function useRescheduleMyBooking(): UseMutationResult<
  AgendaBooking,
  ApiClientError,
  RescheduleMyBookingInput
> {
  const queryClient = useQueryClient();
  return useMutation<AgendaBooking, ApiClientError, RescheduleMyBookingInput>({
    mutationFn: ({ id, startAt, employeeId }) => {
      const body: Record<string, unknown> = { startAt };
      if (employeeId) body.employeeId = employeeId;
      return apiClient.patch<AgendaBooking>(`bookings/${id}/reschedule`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portalKeys.bookings }),
  });
}
