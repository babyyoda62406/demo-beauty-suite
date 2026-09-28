import * as React from 'react';
import { Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';

export interface ChartCardProps {
  title: string;
  description?: string;
  /** Acciones/filtros a la derecha de la cabecera (p.ej. selector de rango). */
  actions?: React.ReactNode;
  loading?: boolean;
  /** Cuando `true`, muestra un estado vacío en lugar del gráfico. */
  empty?: boolean;
  emptyMessage?: string;
  /** Altura del área del gráfico (px). Por defecto 288 (h-72). */
  height?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Contenedor de marca para gráficas: cabecera con título/acciones y área con
 * estados de carga y vacío. El gráfico (recharts) va como `children`.
 */
export function ChartCard({
  title,
  description,
  actions,
  loading = false,
  empty = false,
  emptyMessage = 'No hay datos para el periodo seleccionado.',
  height = 288,
  className,
  children,
}: ChartCardProps): React.JSX.Element {
  return (
    <Card className={cn('flex flex-col p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="font-serif text-lg font-semibold tracking-tight text-ink">{title}</h3>
          {description ? <p className="text-sm text-ink-soft/70">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div style={{ height }} className="min-w-0">
        {loading ? (
          <Skeleton className="size-full rounded-xl" />
        ) : empty ? (
          <EmptyState title="Sin datos" description={emptyMessage} className="h-full border-0 bg-transparent py-0" />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
