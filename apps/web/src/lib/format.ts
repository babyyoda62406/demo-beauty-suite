/**
 * Formateo de dinero, fechas y rangos para toda la app (locale es-ES).
 *
 * - El dinero llega SIEMPRE en céntimos (Int) desde la API → se divide entre 100.
 * - Las fechas usan date-fns con el locale español.
 */
import {
  format,
  formatDistanceToNow,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

/** Valor de fecha aceptado por los helpers: Date, ISO string o epoch ms. */
export type DateInput = Date | string | number;

const LOCALE = 'es-ES';

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** ¿Es una fecha válida? (evita "Invalid Date" en la UI). */
export function isValidDate(value: DateInput): boolean {
  const date = toDate(value);
  return !Number.isNaN(date.getTime());
}

// -----------------------------------------------------------------------------
// Dinero
// -----------------------------------------------------------------------------

/**
 * Formatea un importe en **céntimos** como divisa localizada.
 * @example formatMoney(1250) // "12,50 €"
 */
export function formatMoney(cents: number, currency = 'EUR'): string {
  const amount = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Precio de un servicio para la web pública. Los servicios "a consultar/
 * incluido/aparte" llegan con price 0 desde la API (el modelo Service no tiene
 * columna priceOnRequest, así que price===0 es la única señal disponible) → se
 * muestran "Consultar" en vez de "0,00 €".
 */
export function formatServicePrice(cents: number, currency = 'EUR'): string {
  return cents > 0 ? formatMoney(cents, currency) : 'Consultar';
}

/**
 * Como {@link formatMoney} pero sin decimales cuando el importe es entero
 * (útil para KPIs compactos). "1.200 €" en vez de "1.200,00 €".
 */
export function formatMoneyCompact(cents: number, currency = 'EUR'): string {
  const amount = (Number.isFinite(cents) ? cents : 0) / 100;
  const hasFraction = amount % 1 !== 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Formatea un número entero/decimal con separadores de miles es-ES. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE, options).format(value);
}

/** Formatea una fracción (0–1) como porcentaje. `formatPercent(0.128)` → "12,8 %". */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(ratio) ? ratio : 0);
}

// -----------------------------------------------------------------------------
// Fechas
// -----------------------------------------------------------------------------

/** Fecha larga: "1 de agosto de 2026". */
export function formatDate(value: DateInput, pattern = "d 'de' MMMM 'de' yyyy"): string {
  if (!isValidDate(value)) return '—';
  return format(toDate(value), pattern, { locale: es });
}

/** Fecha corta: "01/08/2026". */
export function formatDateShort(value: DateInput): string {
  if (!isValidDate(value)) return '—';
  return format(toDate(value), 'dd/MM/yyyy', { locale: es });
}

/** Fecha + hora: "1 ago 2026, 14:30". */
export function formatDateTime(value: DateInput): string {
  if (!isValidDate(value)) return '—';
  return format(toDate(value), "d MMM yyyy, HH:mm", { locale: es });
}

/** Solo hora: "14:30". */
export function formatTime(value: DateInput): string {
  if (!isValidDate(value)) return '—';
  return format(toDate(value), 'HH:mm', { locale: es });
}

/** Día de la semana capitalizado: "Sábado". */
export function formatWeekday(value: DateInput): string {
  if (!isValidDate(value)) return '—';
  const raw = format(toDate(value), 'EEEE', { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Tiempo relativo con sufijo: "hace 5 minutos", "en 2 días". */
export function formatRelative(value: DateInput): string {
  if (!isValidDate(value)) return '—';
  return formatDistanceToNow(toDate(value), { locale: es, addSuffix: true });
}

// -----------------------------------------------------------------------------
// Rangos de fechas
// -----------------------------------------------------------------------------

export interface DateRange {
  from: Date;
  to: Date;
}

/** Preajustes de rango habituales en paneles/estadísticas. */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear';

/** Etiquetas en español para los preajustes de rango. */
export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  thisWeek: 'Esta semana',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  thisYear: 'Este año',
};

/** Construye un {@link DateRange} a partir de un preajuste (semana empieza en lunes). */
export function getDateRange(preset: DateRangePreset, now: Date = new Date()): DateRange {
  const weekOpts = { weekStartsOn: 1 as const };
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'last7':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last30':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'thisWeek':
      return { from: startOfWeek(now, weekOpts), to: endOfWeek(now, weekOpts) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case 'thisYear':
      return { from: startOfYear(now), to: endOfYear(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

/**
 * Representa un rango como texto legible, colapsando partes comunes.
 * @example "1 – 15 ago 2026", "28 jul – 3 ago 2026", "2025 – 2026"
 */
export function formatDateRange(range: DateRange): string {
  const { from, to } = range;
  if (!isValidDate(from) || !isValidDate(to)) return '—';

  if (isSameDay(from, to)) return formatDate(from, 'd MMM yyyy');

  if (isSameMonth(from, to) && isSameYear(from, to)) {
    return `${format(from, 'd', { locale: es })} – ${format(to, 'd MMM yyyy', { locale: es })}`;
  }
  if (isSameYear(from, to)) {
    return `${format(from, 'd MMM', { locale: es })} – ${format(to, 'd MMM yyyy', { locale: es })}`;
  }
  return `${format(from, 'd MMM yyyy', { locale: es })} – ${format(to, 'd MMM yyyy', { locale: es })}`;
}

/** Convierte un rango a los parámetros ISO (yyyy-MM-dd) que espera la API. */
export function dateRangeToQuery(range: DateRange): { from: string; to: string } {
  return {
    from: format(range.from, 'yyyy-MM-dd'),
    to: format(range.to, 'yyyy-MM-dd'),
  };
}
