'use client';

import * as React from 'react';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import { Badge, Skeleton } from '@/components/ui';
import { useLowStock } from '@/lib/hooks/inventory';
import { cn } from '@/lib/utils';

export interface LowStockBannerProps {
  className?: string;
  /** Al hacer clic en el aviso o en un producto, cambia a la pestaña de Productos filtrada. */
  onViewProduct?: (productId: string) => void;
}

/**
 * Aviso destacado de stock bajo (GET /inventory/low-stock). Se muestra en la
 * cabecera de Inventario, visible independientemente de la pestaña activa.
 */
export function LowStockBanner({ className, onViewProduct }: LowStockBannerProps): React.JSX.Element | null {
  const { data, isLoading, isError } = useLowStock({ pageSize: 8, sortBy: 'stock', sortOrder: 'asc' });

  if (isLoading) {
    return (
      <div className={cn('rounded-2xl border border-warning/20 bg-warning/5 p-4', className)}>
        <Skeleton className="h-5 w-64" />
      </div>
    );
  }

  if (isError) return null;

  const items = data?.data ?? [];
  if (items.length === 0) return null;

  const total = data?.meta.total ?? items.length;

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-warning/25 bg-warning/5 p-4 shadow-soft',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold text-ink">
            {total === 1 ? '1 producto con stock bajo' : `${total} productos con stock bajo`}
          </p>
          <p className="text-sm text-ink-soft/80">
            Igual o por debajo de su umbral configurado. Revisa y reabastece cuanto antes.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pl-[3.25rem]">
        {items.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onViewProduct?.(product.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-white px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/40"
          >
            <PackageSearch className="size-3.5 text-warning" aria-hidden="true" />
            {product.name}
            <Badge variant="warning" className="ml-0.5 px-1.5 py-0">
              {product.stock}/{product.lowStockThreshold}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
