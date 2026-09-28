'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  /** Etiqueta accesible cuando no hay un `<label>` asociado visible. */
  'aria-label'?: string | undefined;
  id?: string | undefined;
}

/**
 * Interruptor accesible (rol switch) — no hay primitivo en @fgd/ui.
 * Foco visible, operable por teclado y con transición suave de marca.
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  id,
  'aria-label': ariaLabel,
}: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-500' : 'bg-brand-100',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
