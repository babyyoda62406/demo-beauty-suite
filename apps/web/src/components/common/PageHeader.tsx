import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Acciones a la derecha (botones, menús…). */
  actions?: React.ReactNode;
  /** Migas de pan opcionales por encima del título. */
  breadcrumbs?: BreadcrumbItem[];
  /** Icono/decoración a la izquierda del título. */
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Cabecera de página de marca: título serif, descripción y zona de acciones.
 * Consistente en todas las superficies del dashboard.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  icon,
  className,
}: PageHeaderProps): React.JSX.Element {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Miga de pan">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft/70">
              {breadcrumbs.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="rounded transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-ink-soft">{crumb.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="flex items-center gap-3">
          {icon ? <span className="shrink-0 text-brand-500">{icon}</span> : null}
          <h1 className="truncate font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="max-w-2xl text-sm text-ink-soft/80">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
