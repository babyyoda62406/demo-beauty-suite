'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarClock, Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Skeleton,
  useToast,
} from '@/components/ui';
import { EmptyState, ErrorState, getErrorMessage } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatDate, formatTime } from '@/lib/format';
import { useAvailability } from '@/lib/hooks/reserva';
import { useRescheduleMyBooking, type AgendaBooking } from '@/lib/hooks/portal';

export interface RescheduleDialogProps {
  booking: AgendaBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo para reprogramar una cita propia. Reutiliza la disponibilidad pública
 * (`bookings/availability`) del servicio de la cita: la clienta elige un día y
 * un hueco libre, y confirmamos con `PATCH bookings/:id/reschedule`.
 */
export function RescheduleDialog({
  booking,
  open,
  onOpenChange,
}: RescheduleDialogProps): React.JSX.Element {
  const { toast } = useToast();
  const reschedule = useRescheduleMyBooking();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = React.useState(today);
  const [selected, setSelected] = React.useState<string | null>(null);

  // Reinicia la selección al abrir el diálogo con otra cita.
  React.useEffect(() => {
    if (open) {
      setDate(today);
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id]);

  const availability = useAvailability({
    serviceId: booking?.serviceId,
    date,
    enabled: open && Boolean(booking),
  });

  const slots = availability.data?.slots ?? [];

  const handleConfirm = async (): Promise<void> => {
    if (!booking || !selected) return;
    const slot = slots.find((s) => s.startAt === selected);
    // Mantén a la misma profesional si sigue disponible en el nuevo hueco.
    const keepEmployee =
      booking.employeeId && slot?.employeeIds.includes(booking.employeeId)
        ? booking.employeeId
        : undefined;
    try {
      await reschedule.mutateAsync({
        id: booking.id,
        startAt: selected,
        ...(keepEmployee ? { employeeId: keepEmployee } : {}),
      });
      toast({
        title: 'Cita reprogramada',
        description: `Nueva fecha: ${formatDate(selected, "d 'de' MMMM")} a las ${formatTime(selected)}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'danger',
        title: 'No se pudo reprogramar',
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !reschedule.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reprogramar cita</DialogTitle>
          <DialogDescription>
            {booking?.service?.name ?? 'Servicio'} · elige un nuevo día y hora disponibles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">Nuevo día</Label>
            <input
              id="reschedule-date"
              type="date"
              value={date}
              min={today}
              onChange={(e) => {
                setDate(e.target.value);
                setSelected(null);
              }}
              className="h-11 w-full rounded-xl border border-brand-200 bg-white px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            />
          </div>

          <div className="space-y-2">
            <Label>Horas disponibles</Label>
            <div className="min-h-24">
              {availability.isPending ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-xl" />
                  ))}
                </div>
              ) : availability.isError ? (
                <ErrorState
                  error={availability.error}
                  onRetry={() => void availability.refetch()}
                  className="py-8"
                />
              ) : slots.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="Sin huecos ese día"
                  description="Prueba con otra fecha para ver la disponibilidad."
                  className="py-8"
                />
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => {
                    const active = selected === slot.startAt;
                    return (
                      <button
                        key={slot.startAt}
                        type="button"
                        onClick={() => setSelected(slot.startAt)}
                        aria-pressed={active}
                        className={cn(
                          'h-10 rounded-xl border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                          active
                            ? 'border-transparent bg-brand-gradient text-white shadow-soft'
                            : 'border-brand-200 bg-white text-ink hover:bg-brand-50',
                        )}
                      >
                        {formatTime(slot.startAt)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={reschedule.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || reschedule.isPending}
          >
            {reschedule.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Confirmar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
