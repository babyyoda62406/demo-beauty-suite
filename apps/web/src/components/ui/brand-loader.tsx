import * as React from 'react';
import { cn } from '@/lib/utils';

interface BrandLoaderProps {
  /** Firma manuscrita mostrada bajo el spinner (Allura). */
  label?: string;
  /** Centra el loader en toda la ventana sobre el lienzo crema. */
  fullScreen?: boolean;
  className?: string;
}

/**
 * Indicador de carga de marca (RONDA 1, pto 6): anillo rosa/dorado girando con
 * la firma "Estudio Aurora" en script. Es CSS puro (sirve en Server Components,
 * p.ej. los `loading.tsx` del App Router) y respeta `prefers-reduced-motion`
 * vía la media query global.
 */
export function BrandLoader({
  label = 'Estudio Aurora',
  fullScreen = false,
  className,
}: BrandLoaderProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      className={cn(
        'flex flex-col items-center justify-center gap-5',
        fullScreen && 'min-h-[60vh] w-full',
        className,
      )}
    >
      <span className="relative flex size-14 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-gold/25" aria-hidden="true" />
        <span
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-brand-400 border-t-brand-500"
          aria-hidden="true"
        />
        <span className="size-2.5 rounded-full bg-brand-gradient" aria-hidden="true" />
      </span>
      {label ? (
        <span className="font-script text-3xl leading-none text-brand-600">{label}</span>
      ) : null}
    </div>
  );
}
