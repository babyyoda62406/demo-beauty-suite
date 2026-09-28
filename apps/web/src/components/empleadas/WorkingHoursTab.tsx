'use client';

import * as React from 'react';
import { z } from 'zod';
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Skeleton, toast } from '@/components/ui';
import { EmptyState, ErrorState, getErrorMessage, FormDialog, FieldSelect, FieldText } from '@/components/common';
import {
  useEmployeeSchedule,
  useAddEmployeeSchedule,
  useUpdateEmployeeSchedule,
  useRemoveEmployeeSchedule,
  type WorkingHours,
} from '@/lib/hooks/employees';

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleSchema = z.object({
  weekday: z.string().min(1, 'Obligatorio'),
  startTime: z.string().regex(TIME_REGEX, 'Formato HH:mm'),
  endTime: z.string().regex(TIME_REGEX, 'Formato HH:mm'),
});

export interface WorkingHoursTabProps {
  employeeId: string;
}

/** Pestaña Horarios: tramos semanales de disponibilidad del profesional. */
export function WorkingHoursTab({ employeeId }: WorkingHoursTabProps): React.JSX.Element {
  const query = useEmployeeSchedule(employeeId);
  const addSchedule = useAddEmployeeSchedule();
  const updateSchedule = useUpdateEmployeeSchedule();
  const removeSchedule = useRemoveEmployeeSchedule();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WorkingHours | undefined>(undefined);

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (row: WorkingHours): void => {
    setEditing(row);
    setFormOpen(true);
  };

  const sorted = React.useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)),
    [query.data],
  );

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Añadir tramo
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin horario configurado"
          description="Añade los tramos semanales en los que este profesional está disponible."
          action={<Button onClick={openCreate}>Añadir tramo</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-brand-100/70 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-ink">{WEEKDAY_LABELS[row.weekday]}</p>
                <p className="text-xs text-ink-soft/70 tabular-nums">
                  {row.startTime} – {row.endTime}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Editar tramo" onClick={() => openEdit(row)}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar tramo"
                  onClick={async () => {
                    try {
                      await removeSchedule.mutateAsync({ employeeId, workingHoursId: row.id });
                      toast({ title: 'Tramo eliminado', variant: 'success' });
                    } catch (error) {
                      toast({ title: 'No se pudo eliminar', description: getErrorMessage(error), variant: 'danger' });
                    }
                  }}
                >
                  <Trash2 className="size-4 text-danger" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar tramo de horario' : 'Añadir tramo de horario'}
        schema={scheduleSchema}
        defaultValues={{
          weekday: editing ? String(editing.weekday) : '1',
          startTime: editing?.startTime ?? '09:00',
          endTime: editing?.endTime ?? '18:00',
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Añadir'}
        onSubmit={async (values) => {
          const data = { weekday: Number(values.weekday), startTime: values.startTime, endTime: values.endTime };
          if (editing) {
            await updateSchedule.mutateAsync({ employeeId, workingHoursId: editing.id, data });
            toast({ title: 'Tramo actualizado', variant: 'success' });
          } else {
            await addSchedule.mutateAsync({ employeeId, data });
            toast({ title: 'Tramo añadido', variant: 'success' });
          }
        }}
      >
        <FieldSelect
          name="weekday"
          label="Día de la semana"
          required
          options={WEEKDAY_LABELS.map((label, value) => ({ value: String(value), label }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <FieldText name="startTime" label="Hora de inicio" required type="time" />
          <FieldText name="endTime" label="Hora de fin" required type="time" />
        </div>
      </FormDialog>
    </div>
  );
}
