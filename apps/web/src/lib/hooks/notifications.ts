'use client';

/**
 * Capa de datos de Notificaciones (SPEC §7 `notifications`).
 *
 * Rutas exactas verificadas en
 * `apps/api/src/modules/notifications/notifications.controller.ts`:
 *   GET   /notifications              → feed paginado del usuario (filtro `unread`)
 *   GET   /notifications/unread-count → contador de no leídas
 *   PATCH /notifications/:id/read     → marca una notificación como leída
 *   POST  /notifications/read-all     → marca todas como leídas
 *
 * Ninguna ruta lleva `@Roles`, por lo que cualquier usuario autenticado
 * (incluida una clienta con rol `CLIENT`) puede usarlas sobre sus propias
 * notificaciones — es la única superficie de este dominio que ya funciona de
 * extremo a extremo para el portal clienta.
 */
import type { PaginatedResult } from '@fgd/types';
import { useApiMutation, useApiQuery } from './use-api';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface QueryNotificationsParams {
  page?: number;
  pageSize?: number;
  unread?: boolean;
}

const keys = {
  all: ['notifications'] as const,
  list: (params: QueryNotificationsParams = {}) => [...keys.all, 'list', params] as const,
  unreadCount: () => [...keys.all, 'unread-count'] as const,
};

/** Feed paginado de notificaciones del usuario autenticado. */
export function useNotifications(params: QueryNotificationsParams = {}) {
  return useApiQuery<PaginatedResult<Notification>>(keys.list(params), 'notifications', {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

/** Contador de no leídas (para el badge de navegación). */
export function useUnreadNotificationsCount() {
  return useApiQuery<{ count: number }>(keys.unreadCount(), 'notifications/unread-count', {
    staleTime: 30 * 1000,
  });
}

/** Marca una notificación concreta como leída e invalida feed + contador. */
export function useMarkNotificationRead() {
  return useApiMutation<Notification, string>('notifications', 'PATCH', {
    resolvePath: (id) => `notifications/${id}/read`,
    invalidateKeys: [keys.all],
  });
}

/** Marca todas las notificaciones del usuario como leídas. */
export function useMarkAllNotificationsRead() {
  return useApiMutation<{ updated: number }, void>('notifications/read-all', 'POST', {
    invalidateKeys: [keys.all],
  });
}
