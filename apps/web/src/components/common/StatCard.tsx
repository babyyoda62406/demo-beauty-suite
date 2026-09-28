import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';

export interface StatDelta {
  /** Variación como fracción (0.12 = +12 %). El signo determina el color. */
  value: number;
  /** Texto contextual, p.ej. "vs. mes anterior". */
  label?: string;
  /** Si `true`, una bajada se pinta en verde (p.ej. cancelaciones). */
  invert?: boolean;
}

export interface StatCardProps {
  label: string;
  /** Valor ya formateado (dinero, número, etc.). */
  value: React.ReactNode;
  icon?: LucideIcon;
  delta?: StatDelta;
  /** Texto auxiliar bajo el valor. */
  hint?: string;
  loading?: boolean;
  className?: string;
}

/**
 * Tarjeta KPI de marca: etiqueta, valor grande, icono en cápsula magenta y
 * delta opcional con flecha y color según tendencia.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  loading = false,
  className,
}: StatCardProps): React.JSX.Element {
  const isUp = delta ? delta.value >= 0 : false;
  const positive = delta?.invert ? !isUp : isUp;

  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-brand-gradient opacity-10 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-soft/80">{label}</p>
        {Icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">{value}</p>
      )}

      {delta && !loading ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
              positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
            )}
          >
            {isUp ? (
              <ArrowUpRight className="size-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden="true" />
            )}
            {formatPercent(Math.abs(delta.value))}
          </span>
          {delta.label ? <span className="text-ink-soft/60">{delta.label}</span> : null}
        </div>
      ) : hint && !loading ? (
        <p className="mt-2 text-xs text-ink-soft/60">{hint}</p>
      ) : null}
    </Card>
  );
}
