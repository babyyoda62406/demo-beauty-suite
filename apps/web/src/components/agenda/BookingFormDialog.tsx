'use client';

/**
 * Modal de alta manual de cita (source ADMIN → CONFIRMED). Prefija fecha/hora
 * desde el hueco pulsado en el calendario. Reutiliza `FormDialog` (zod + rhf) y
 * los campos comunes; la clienta se elige con `ClientPicker`.
 */
import * as React from 'react';
import { format } from 'date-fns';
import { z } from 'zod';
import { FormDialog, FieldSelect, FieldTextarea, FieldText } from '@/components/common';
import { useToast } from '@/components/ui';
import {
  useCreateManualBooking,
  type AgendaEmployee,
  type AgendaService,
} from '@/lib/hooks/bookings';
import { formatMoney } from '@/lib/format';
import { ClientPicker } from './ClientPicker';

const schema = z.object({
  clientId: z.string().min(1, 'Selecciona una clienta'),
  serviceId: z.string().min(1, 'Selecciona un servicio'),
  employeeId: z.string().optional(),
  date: z.string().min(1, 'Indica la fecha'),
  time: z.string().min(1, 'Indica la hora'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type BookingFormValues = z.infer<typeof schema>;

export interface BookingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Inicio del hueco pulsado (fecha/hora prefijadas). */
  slotStart: Date | null;
  /** Profesional preseleccionado (si el filtro está activo). */
  defaultEmployeeId?: string | undefined;
  services: AgendaService[];
  employees: AgendaEmployee[];
}

export function BookingFormDialog({
  open,
  onOpenChange,
  slotStart,
  defaultEmployeeId,
  services,
  employees,
}: BookingFormDialogProps): React.JSX.Element {
  const { toast } = useToast();
  const createBooking = useCreateManualBooking();
  const anchor = slotStart ?? new Date();

  const serviceOptions = services.map((s) => ({
    value: s.id,
    label: `${s.name} · ${s.durationMin} min · ${formatMoney(s.price, s.currency)}`,
  }));

  const employeeOptions = [
    { value: '', label: 'Sin asignar (cualquiera)' },
    ...employees.map((e) => ({ value: e.id, label: e.name })),
  ];

  const defaultValues: BookingFormValues = {
    clientId: '',
    serviceId: '',
    employeeId: defaultEmployeeId ?? '',
    date: format(anchor, 'yyyy-MM-dd'),
    time: format(anchor, 'HH:mm'),
    notes: '',
  };

  const handleSubmit = async (values: BookingFormValues): Promise<void> => {
    // `date`+`time` son hora local → ISO UTC para el backend.
    const startAt = new Date(`${values.date}T${values.time}`).toISOString();
    await createBooking.mutateAsync({
      clientId: values.clientId,
      serviceId: values.serviceId,
      startAt,
      employeeId: values.employeeId ? values.employeeId : undefined,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    });
    toast({ title: 'Cita creada', description: 'La cita se ha añadido a la agenda.', variant: 'success' });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva cita"
      description="Programa una cita para una clienta existente."
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitLabel="Crear cita"
    >
      <ClientPicker<BookingFormValues> name="clientId" required />
      <FieldSelect<BookingFormValues>
        name="serviceId"
        label="Servicio"
        required
        placeholder="Selecciona un servicio"
        options={serviceOptions}
      />
      <FieldSelect<BookingFormValues>
        name="employeeId"
        label="Profesional"
        options={employeeOptions}
      />
      <div className="grid grid-cols-2 gap-3">
        <FieldText<BookingFormValues> name="date" label="Fecha" type="date" required />
        <FieldText<BookingFormValues> name="time" label="Hora" type="time" required />
      </div>
      <FieldTextarea<BookingFormValues>
        name="notes"
        label="Notas internas"
        rows={2}
        placeholder="Preferencias, observaciones…"
      />
    </FormDialog>
  );
}
