import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';

export interface MoneyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Importe en **céntimos**. */
  cents: number;
  currency?: string | undefined;
  /** Colorea según signo (verde positivo / rojo negativo). */
  colored?: boolean | undefined;
  /** Antepone el signo `+` a los importes positivos. */
  showSign?: boolean | undefined;
}

/**
 * Renderiza un importe en céntimos como divisa es-ES. Tabular-nums para que las
 * cifras alineen en columnas de tabla.
 */
export function MoneyText({
  cents,
  currency = 'EUR',
  colored = false,
  showSign = false,
  className,
  ...props
}: MoneyTextProps): React.JSX.Element {
  const formatted = formatMoney(Math.abs(cents), currency);
  const sign = cents < 0 ? '−' : showSign && cents > 0 ? '+' : '';
  return (
    <span
      className={cn(
        'tabular-nums',
        colored && cents > 0 && 'text-success',
        colored && cents < 0 && 'text-danger',
        className,
      )}
      {...props}
    >
      {sign}
      {formatted}
    </span>
  );
}
