/**
 * Barrel de la feature "Agenda" (SPEC §7). El calendario en sí (AgendaCalendar)
 * se importa dinámicamente desde AgendaView y no se reexporta aquí.
 */
export { AgendaView } from './AgendaView';
export { EmployeeFilter, type EmployeeFilterProps } from './EmployeeFilter';
export { WaitlistPanel } from './WaitlistPanel';
export { BookingFormDialog, type BookingFormDialogProps } from './BookingFormDialog';
export { BookingDetailDrawer, type BookingDetailDrawerProps } from './BookingDetailDrawer';
export {
  FC_VIEW,
  VIEW_LABEL,
  STATUS_LABEL,
  isMutedStatus,
  readableTextColor,
  type AgendaViewId,
} from './agenda-utils';
