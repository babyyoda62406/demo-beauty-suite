'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/components/common';
import { formatDate, formatTime } from '@/lib/format';
import { useCancelMyBooking, type AgendaBooking } from '@/lib/hooks/portal';

export interface CancelBookingDialogProps {
  booking: AgendaBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Diálogo para cancelar una cita propia, con motivo opcional. */
export function CancelBookingDialog({
  booking,
  open,
  onOpenChange,
}: CancelBookingDialogProps): React.JSX.Element {
  const { toast } = useToast();
  const cancel = useCancelMyBooking();
  const [reason, setReason] = React.useState('');

  // Limpia el motivo cada vez que se abre con una cita distinta.
  React.useEffect(() => {
    if (open) setReason('');
  }, [open, booking?.id]);

  const handleConfirm = async (): Promise<void> => {
    if (!booking) return;
    try {
      await cancel.mutateAsync({ id: booking.id, reason });
      toast({ title: 'Cita cancelada', description: 'Tu cita ha sido cancelada correctamente.' });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'danger',
        title: 'No se pudo cancelar la cita',
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !cancel.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar cita</DialogTitle>
          <DialogDescription>
            {booking ? (
              <>
                {booking.service?.name ?? 'Servicio'} ·{' '}
                {formatDate(booking.startAt, "d 'de' MMMM")} a las {formatTime(booking.startAt)}.
                Esta acción no se puede deshacer.
              </>
            ) : (
              'Esta acción no se puede deshacer.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cuéntanos por qué cancelas para poder mejorar."
            rows={3}
            disabled={cancel.isPending}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={cancel.isPending}
          >
            Volver
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={cancel.isPending}>
            {cancel.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Cancelar cita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
