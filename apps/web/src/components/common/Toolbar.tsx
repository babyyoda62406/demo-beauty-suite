import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Contenido alineado a la izquierda (búsqueda, filtros). */
  start?: React.ReactNode;
  /** Contenido alineado a la derecha (acciones). */
  end?: React.ReactNode;
}

/**
 * Barra de herramientas para listados: filtros/búsqueda a la izquierda,
 * acciones a la derecha. Envuelve en móvil.
 */
export function Toolbar({
  start,
  end,
  className,
  children,
  ...props
}: ToolbarProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <div className="flex flex-1 flex-wrap items-center gap-2">{start}</div>
          {end ? <div className="flex flex-wrap items-center gap-2">{end}</div> : null}
        </>
      )}
    </div>
  );
}
