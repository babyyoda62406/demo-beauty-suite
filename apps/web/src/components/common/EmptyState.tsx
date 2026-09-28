import * as React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Icono lucide representativo del recurso vacío. */
  icon?: LucideIcon | undefined;
  title: string;
  description?: string | undefined;
  /** Acción principal opcional (p.ej. "Crear cliente"). */
  action?: React.ReactNode;
  className?: string | undefined;
}

/**
 * Estado vacío de marca: icono en cápsula magenta, título serif y CTA opcional.
 * Úsalo cuando una lista/tabla no tiene datos (no confundir con carga o error).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-brand-100 bg-surface-subtle/50 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-ink-soft/80">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
