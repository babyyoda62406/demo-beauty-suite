import * as React from 'react';
import { MoneyText } from './MoneyText';
import { StatusBadge, type StatusConfig } from './StatusBadge';
import { formatDate, formatDateTime, type DateInput } from '@/lib/format';

/**
 * Celdas reutilizables para columnas de {@link DataTable}. Encapsulan el
 * formateo de marca (dinero es-ES, fechas date-fns, badges de estado).
 */

export interface MoneyCellProps {
  cents: number | null | undefined;
  currency?: string;
  colored?: boolean;
}

/** Celda de importe (céntimos → €), alineada a la derecha vía `tabular-nums`. */
export function MoneyCell({ cents, currency, colored }: MoneyCellProps): React.JSX.Element {
  if (cents == null) return <span className="text-ink-soft/40">—</span>;
  return <MoneyText cents={cents} currency={currency} colored={colored} />;
}

export interface DateCellProps {
  value: DateInput | null | undefined;
  /** Incluye la hora. */
  withTime?: boolean;
}

/** Celda de fecha localizada (es-ES). */
export function DateCell({ value, withTime }: DateCellProps): React.JSX.Element {
  if (value == null) return <span className="text-ink-soft/40">—</span>;
  return <span className="text-ink-soft">{withTime ? formatDateTime(value) : formatDate(value)}</span>;
}

export interface StatusCellProps {
  status: string | null | undefined;
  overrides?: Record<string, StatusConfig>;
}

/** Celda de estado (badge de color). */
export function StatusCell({ status, overrides }: StatusCellProps): React.JSX.Element {
  if (!status) return <span className="text-ink-soft/40">—</span>;
  return <StatusBadge status={status} overrides={overrides} />;
}
