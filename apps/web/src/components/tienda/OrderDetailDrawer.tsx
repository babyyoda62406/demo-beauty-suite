'use client';

import * as React from 'react';
import { Package, User } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { Drawer, MoneyText, StatusBadge, getErrorMessage } from '@/components/common';
import { formatDateTime } from '@/lib/format';
import {
  ORDER_TRANSITIONS,
  useUpdateOrderStatus,
  type Order,
  type OrderStatus,
} from '@/lib/hooks/store';

/** Etiquetas en español para el botón de cada transición de estado. */
const TRANSITION_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Marcar pendiente',
  PAID: 'Marcar como pagado',
  PROCESSING: 'Pasar a procesando',
  SHIPPED: 'Marcar como enviado',
  DELIVERED: 'Marcar como entregado',
  CANCELLED: 'Cancelar pedido',
  REFUNDED: 'Marcar como reembolsado',
};

export interface OrderDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | undefined;
}

/** Panel de detalle de un pedido: líneas, importes, clienta y cambio de estado. */
export function OrderDetailDrawer({ open, onOpenChange, order }: OrderDetailDrawerProps): React.JSX.Element {
  const updateStatus = useUpdateOrderStatus();
  const nextStatuses = order ? ORDER_TRANSITIONS[order.status] : [];

  const handleTransition = async (status: OrderStatus): Promise<void> => {
    if (!order) return;
    try {
      await updateStatus.mutateAsync({ id: order.id, status });
      toast({ title: 'Estado del pedido actualizado', variant: 'success' });
    } catch (error) {
      toast({ title: 'No se pudo actualizar el estado', description: getErrorMessage(error), variant: 'danger' });
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={order ? `Pedido #${order.id.slice(0, 8)}` : 'Pedido'}
      description={order ? formatDateTime(order.createdAt) : undefined}
      footer={
        order && nextStatuses.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                variant={status === 'CANCELLED' ? 'danger' : 'outline'}
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleTransition(status)}
              >
                {TRANSITION_LABELS[status]}
              </Button>
            ))}
          </div>
        ) : undefined
      }
    >
      {!order ? null : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <MoneyText cents={order.total} currency={order.currency} className="text-lg font-semibold" />
          </div>

          <section className="space-y-2 rounded-xl border border-brand-100/70 bg-surface-subtle/40 p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
              <User className="size-4 text-brand-500" aria-hidden="true" />
              Clienta
            </h3>
            {order.client ? (
              <div className="text-sm text-ink-soft">
                <p className="font-medium text-ink">{order.client.name}</p>
                {order.client.phone ? <p>{order.client.phone}</p> : null}
                {order.client.email ? <p>{order.client.email}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-ink-soft/70">Sin clienta asociada.</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
              <Package className="size-4 text-brand-500" aria-hidden="true" />
              Artículos
            </h3>
            <div className="divide-y divide-brand-50 rounded-xl border border-brand-100/70">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {item.product?.name ?? 'Producto eliminado'}
                    </p>
                    <p className="text-xs text-ink-soft/70">
                      {item.product?.sku ?? '—'} · {item.quantity} × <MoneyText cents={item.unitPrice} currency={order.currency} />
                    </p>
                  </div>
                  <MoneyText
                    cents={item.unitPrice * item.quantity}
                    currency={order.currency}
                    className="shrink-0 font-medium"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-1.5 rounded-xl border border-brand-100/70 p-4 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <MoneyText cents={order.subtotal} currency={order.currency} />
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>Envío</span>
              <MoneyText cents={order.shipping} currency={order.currency} />
            </div>
            <div className="flex justify-between border-t border-brand-100/70 pt-1.5 font-semibold text-ink">
              <span>Total</span>
              <MoneyText cents={order.total} currency={order.currency} />
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
