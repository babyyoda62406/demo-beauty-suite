'use client';

/**
 * Panel de detalle de una cita con la máquina de estados completa:
 * confirmar / completar / no-show / cancelar (con motivo). Muestra clienta,
 * servicio, profesional, horario, importe y notas. Las acciones disponibles
 * dependen del estado actual.
 */
import * as React from 'react';
import {
  CalendarClock,
  Check,
  CircleSlash,
  Clock,
  Mail,
  Phone,
  Scissors,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  useToast,
} from '@/components/ui';
import { Drawer, StatusBadge, ConfirmDialog, getErrorMessage } from '@/components/common';
import { formatMoney, formatDate, formatTime, formatWeekday } from '@/lib/format';
import {
  useCancelBooking,
  useCompleteBooking,
  useConfirmBooking,
  useNoShowBooking,
  type AgendaBooking,
} from '@/lib/hooks/bookings';

export interface BookingDetailDrawerProps {
  booking: AgendaBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft/60">{label}</p>
        <div className="text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}

export function BookingDetailDrawer({
  booking,
  open,
  onOpenChange,
}: BookingDetailDrawerProps): React.JSX.Element {
  const { toast } = useToast();
  const confirmBooking = useConfirmBooking();
  const completeBooking = useCompleteBooking();
  const noShowBooking = useNoShowBooking();
  const cancelBooking = useCancelBooking();

  const [confirmAction, setConfirmAction] = React.useState<'confirm' | 'complete' | 'noshow' | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const anyPending =
    confirmBooking.isPending ||
    completeBooking.isPending ||
    noShowBooking.isPending ||
    cancelBooking.isPending;

  if (!booking) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} title="Cita">
        {null}
      </Drawer>
    );
  }

  const { status } = booking;
  const canConfirm = status === 'PENDING';
  const canComplete = status === 'CONFIRMED';
  const canNoShow = status === 'CONFIRMED';
  const canCancel = status === 'PENDING' || status === 'CONFIRMED';
  const isTerminal = !canCancel && !canComplete;

  const runToast = (title: string): void => {
    toast({ title, variant: 'success' });
    onOpenChange(false);
  };

  const handleConfirmDialog = async (): Promise<void> => {
    try {
      if (confirmAction === 'confirm') {
        await confirmBooking.mutateAsync(booking.id);
        runToast('Cita confirmada');
      } else if (confirmAction === 'complete') {
        await completeBooking.mutateAsync(booking.id);
        runToast('Cita completada');
      } else if (confirmAction === 'noshow') {
        await noShowBooking.mutateAsync(booking.id);
        runToast('Marcada como no asistió');
      }
    } catch (error) {
      toast({ title: 'No se pudo actualizar', description: getErrorMessage(error), variant: 'danger' });
    } finally {
      setConfirmAction(null);
    }
  };

  const handleCancel = async (): Promise<void> => {
    try {
      await cancelBooking.mutateAsync({ id: booking.id, reason: reason.trim() || undefined });
      setCancelOpen(false);
      setReason('');
      runToast('Cita cancelada');
    } catch (error) {
      toast({ title: 'No se pudo cancelar', description: getErrorMessage(error), variant: 'danger' });
    }
  };

  const confirmDialogCopy: Record<
    'confirm' | 'complete' | 'noshow',
    { title: string; description: string; confirmLabel: string; variant: 'primary' | 'danger' }
  > = {
    confirm: {
      title: '¿Confirmar la cita?',
      description: 'La clienta pasará a estado confirmada.',
      confirmLabel: 'Confirmar cita',
      variant: 'primary',
    },
    complete: {
      title: '¿Marcar como completada?',
      description: 'Se registrará el servicio y el sello de fidelización.',
      confirmLabel: 'Completar',
      variant: 'primary',
    },
    noshow: {
      title: '¿Marcar como no asistió?',
      description: 'La cita se registrará como no asistida.',
      confirmLabel: 'No asistió',
      variant: 'danger',
    },
  };

  const footer = isTerminal ? (
    <p className="w-full text-center text-xs text-ink-soft/60">
      Esta cita está cerrada y no admite más cambios.
    </p>
  ) : (
    <div className="flex w-full flex-wrap justify-end gap-2">
      {canCancel ? (
        <Button variant="ghost" onClick={() => setCancelOpen(true)} disabled={anyPending}>
          <X aria-hidden="true" /> Cancelar cita
        </Button>
      ) : null}
      {canNoShow ? (
        <Button variant="outline" onClick={() => setConfirmAction('noshow')} disabled={anyPending}>
          <CircleSlash aria-hidden="true" /> No asistió
        </Button>
      ) : null}
      {canConfirm ? (
        <Button onClick={() => setConfirmAction('confirm')} disabled={anyPending}>
          <Check aria-hidden="true" /> Confirmar
        </Button>
      ) : null}
      {canComplete ? (
        <Button onClick={() => setConfirmAction('complete')} disabled={anyPending}>
          <Sparkles aria-hidden="true" /> Completar
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title={booking.client.name}
        description={
          <span className="inline-flex items-center gap-2">
            <StatusBadge status={booking.status} />
          </span>
        }
        footer={footer}
      >
        <div className="space-y-5">
          <InfoRow icon={CalendarClock} label="Fecha">
            <span className="font-medium">
              {formatWeekday(booking.startAt)}, {formatDate(booking.startAt)}
            </span>
          </InfoRow>

          <InfoRow icon={Clock} label="Horario">
            {formatTime(booking.startAt)} – {formatTime(booking.endAt)}
          </InfoRow>

          <InfoRow icon={Scissors} label="Servicio">
            <span className="font-medium">{booking.service.name}</span>
            <span className="text-ink-soft/60">
              {' '}
              · {booking.service.durationMin} min · {formatMoney(booking.price, booking.currency)}
            </span>
          </InfoRow>

          <InfoRow icon={UserRound} label="Profesional">
            {booking.employee ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: booking.employee.color }}
                  aria-hidden="true"
                />
                {booking.employee.name}
              </span>
            ) : (
              <span className="text-ink-soft/60">Sin asignar</span>
            )}
          </InfoRow>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-brand-100 bg-surface-subtle/60 p-3">
            <a
              href={`tel:${booking.client.phone}`}
              className="flex items-center gap-2 text-sm text-ink transition-colors hover:text-brand-600"
            >
              <Phone className="size-4 text-brand-500" aria-hidden="true" />
              {booking.client.phone}
            </a>
            {booking.client.email ? (
              <a
                href={`mailto:${booking.client.email}`}
                className="flex items-center gap-2 text-sm text-ink transition-colors hover:text-brand-600"
              >
                <Mail className="size-4 text-brand-500" aria-hidden="true" />
                {booking.client.email}
              </a>
            ) : null}
          </div>

          {booking.notes ? (
            <div className="rounded-xl border border-brand-100 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft/60">
                Notas
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink">{booking.notes}</p>
            </div>
          ) : null}
        </div>
      </Drawer>

      {confirmAction ? (
        <ConfirmDialog
          open={confirmAction !== null}
          onOpenChange={(next) => !next && setConfirmAction(null)}
          title={confirmDialogCopy[confirmAction].title}
          description={confirmDialogCopy[confirmAction].description}
          confirmLabel={confirmDialogCopy[confirmAction].confirmLabel}
          variant={confirmDialogCopy[confirmAction].variant}
          onConfirm={handleConfirmDialog}
        />
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={(next) => !cancelBooking.isPending && setCancelOpen(next)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar cita</DialogTitle>
            <DialogDescription>
              Indica opcionalmente el motivo. Se anexará a las notas de la cita.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo de la cancelación (opcional)…"
            maxLength={300}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={cancelBooking.isPending}
            >
              Volver
            </Button>
            <Button variant="danger" onClick={handleCancel} disabled={cancelBooking.isPending}>
              Cancelar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
