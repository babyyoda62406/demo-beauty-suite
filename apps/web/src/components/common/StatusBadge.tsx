import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Config de presentación de un estado: variante de color + etiqueta en español. */
export interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

/**
 * Mapa de estados de dominio → color + etiqueta. Cubre citas, pagos, pedidos y
 * genéricos. Las claves se comparan en minúsculas para tolerar mayúsculas.
 */
export const STATUS_MAP: Record<string, StatusConfig> = {
  // Citas
  pending: { label: 'Pendiente', variant: 'warning' },
  confirmed: { label: 'Confirmada', variant: 'success' },
  completed: { label: 'Completada', variant: 'brand' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
  canceled: { label: 'Cancelada', variant: 'danger' },
  no_show: { label: 'No asistió', variant: 'danger' },
  in_progress: { label: 'En curso', variant: 'brand' },
  rescheduled: { label: 'Reprogramada', variant: 'warning' },
  waitlist: { label: 'Lista de espera', variant: 'neutral' },
  // Pagos / facturación
  paid: { label: 'Pagado', variant: 'success' },
  unpaid: { label: 'Sin pagar', variant: 'warning' },
  refunded: { label: 'Reembolsado', variant: 'neutral' },
  failed: { label: 'Fallido', variant: 'danger' },
  partial: { label: 'Parcial', variant: 'warning' },
  // Pedidos / stock
  processing: { label: 'Procesando', variant: 'brand' },
  shipped: { label: 'Enviado', variant: 'success' },
  delivered: { label: 'Entregado', variant: 'success' },
  out_of_stock: { label: 'Sin stock', variant: 'danger' },
  low_stock: { label: 'Stock bajo', variant: 'warning' },
  in_stock: { label: 'En stock', variant: 'success' },
  // Genéricos
  active: { label: 'Activo', variant: 'success' },
  inactive: { label: 'Inactivo', variant: 'neutral' },
  draft: { label: 'Borrador', variant: 'neutral' },
  archived: { label: 'Archivado', variant: 'neutral' },
  expired: { label: 'Caducado', variant: 'danger' },
  enabled: { label: 'Activado', variant: 'success' },
  disabled: { label: 'Desactivado', variant: 'neutral' },
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  /** Valor de estado del backend (case-insensitive). */
  status: string;
  /** Sobrescribe la etiqueta derivada del mapa. */
  label?: string | undefined;
  /** Sobrescribe la variante derivada del mapa. */
  variant?: BadgeVariant | undefined;
  /** Mapa adicional/override para estados propios de una feature. */
  overrides?: Record<string, StatusConfig> | undefined;
}

/**
 * Badge que traduce un estado del dominio a color + etiqueta en español.
 * Desconocidos caen a la variante `neutral` con el texto original.
 */
export function StatusBadge({
  status,
  label,
  variant,
  overrides,
  ...props
}: StatusBadgeProps): React.JSX.Element {
  const key = String(status ?? '').toLowerCase();
  const config = overrides?.[key] ?? STATUS_MAP[key];
  return (
    <Badge variant={variant ?? config?.variant ?? 'neutral'} {...props}>
      {label ?? config?.label ?? status}
    </Badge>
  );
}
