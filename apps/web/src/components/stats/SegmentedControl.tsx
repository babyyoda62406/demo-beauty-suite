'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Etiqueta accesible del grupo (radiogroup). */
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string | undefined;
}

/**
 * Control segmentado de marca (pastilla con opciones excluyentes). Se usa para
 * el selector de rango y la granularidad de las gráficas. Accesible como
 * `radiogroup` con navegación por teclado nativa de los `radio`.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-full border border-brand-100 bg-surface-subtle/60 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active
                ? 'bg-brand-gradient text-white shadow-soft'
                : 'text-ink-soft/80 hover:bg-brand-50 hover:text-brand-700',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
