'use client';

import * as React from 'react';
import { Bell, BellOff, Calendar, CheckCheck, Gift, Heart, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/format';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type Notification,
} from '@/lib/hooks/notifications';

const PAGE_SIZE = 20;

const TYPE_ICONS: Record<string, LucideIcon> = {
  BOOKING: Calendar,
  APPOINTMENT: Calendar,
  LOYALTY: Heart,
  VOUCHER: Gift,
  GIFT_CARD: Gift,
  PROMO: Sparkles,
  MARKETING: Sparkles,
};

function iconFor(type: string): LucideIcon {
  return TYPE_ICONS[type.toUpperCase()] ?? Bell;
}

/** Feed de notificaciones de la clienta (`/portal/notificaciones`). */
export function NotificationsView(): React.JSX.Element {
  const [onlyUnread, setOnlyUnread] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const query = useNotifications({ page, pageSize: PAGE_SIZE, ...(onlyUnread ? { unread: true } : {}) });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;
  const unreadInPage = items.some((n) => !n.read);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100/70 bg-white p-3 shadow-card">
        <div className="flex items-center gap-1.5">
          <FilterButton active={!onlyUnread} onClick={() => { setOnlyUnread(false); setPage(1); }}>
            Todas
          </FilterButton>
          <FilterButton active={onlyUnread} onClick={() => { setOnlyUnread(true); setPage(1); }}>
            No leídas
          </FilterButton>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || !unreadInPage}
        >
          <CheckCheck aria-hidden="true" />
          Marcar todas como leídas
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={onlyUnread ? BellOff : Bell}
          title={onlyUnread ? 'No tienes notificaciones sin leer' : 'Todavía no hay notificaciones'}
          description="Te avisaremos aquí de tus citas, puntos de fidelización y novedades del salón."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={() => markRead.mutate(notification.id)}
              marking={markRead.isPending}
            />
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-ink-soft/70">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
        active ? 'bg-brand-gradient text-white shadow-soft' : 'text-ink-soft hover:bg-brand-50',
      )}
    >
      {children}
    </button>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  marking,
}: {
  notification: Notification;
  onMarkRead: () => void;
  marking: boolean;
}): React.JSX.Element {
  const Icon = iconFor(notification.type);
  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 shadow-card transition-colors',
        notification.read
          ? 'border-brand-100/50 bg-white'
          : 'border-brand-200 bg-brand-50/60',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full',
          notification.read ? 'bg-surface-subtle text-ink-soft/60' : 'bg-brand-gradient text-white shadow-soft',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-semibold', notification.read ? 'text-ink-soft' : 'text-ink')}>
            {notification.title}
          </p>
          {!notification.read ? (
            <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
          ) : null}
        </div>
        <p className="text-sm text-ink-soft/80">{notification.body}</p>
        <p className="text-xs text-ink-soft/50">{formatRelative(notification.createdAt)}</p>
      </div>
      {!notification.read ? (
        <Button variant="ghost" size="sm" onClick={onMarkRead} disabled={marking} className="shrink-0">
          Marcar leída
        </Button>
      ) : null}
    </li>
  );
}
