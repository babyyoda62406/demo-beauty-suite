/**
 * Utilidades puras compartidas por la agenda: paleta de estado, contraste de
 * color de empleada y mapeo de vista ↔ FullCalendar. Sin dependencias de React.
 */
import type { BookingStatus } from '@/lib/hooks/bookings';

/** Vistas expuestas en la UI y su identificador en FullCalendar. */
export type AgendaViewId = 'day' | 'week' | 'month';

export const FC_VIEW: Record<AgendaViewId, string> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
};

export const VIEW_LABEL: Record<AgendaViewId, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

/** Color por defecto cuando la cita no tiene profesional asignado. */
export const UNASSIGNED_COLOR = '#9CA3AF';

/** Estados que ya no ocupan hueco: se muestran atenuados/tachados. */
const MUTED_STATUSES: ReadonlySet<BookingStatus> = new Set(['CANCELLED', 'NO_SHOW']);

export function isMutedStatus(status: BookingStatus): boolean {
  return MUTED_STATUSES.has(status);
}

/** Etiqueta corta del estado para tooltips/leyendas. */
export const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

/**
 * Decide si el texto sobre un color de fondo debe ser oscuro o blanco
 * (luminancia relativa simple). Garantiza legibilidad AA sobre colores de
 * empleada arbitrarios.
 */
export function readableTextColor(hex: string): string {
  const parsed = hex.replace('#', '');
  if (parsed.length !== 6) return '#ffffff';
  const r = parseInt(parsed.slice(0, 2), 16);
  const g = parseInt(parsed.slice(2, 4), 16);
  const b = parseInt(parsed.slice(4, 6), 16);
  // Luminancia percibida (ITU-R BT.601).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#141414' : '#ffffff';
}
