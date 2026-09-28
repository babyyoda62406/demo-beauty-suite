'use client';

import * as React from 'react';
import { z } from 'zod';
import { Check, PalmtreeIcon, Plus, Trash2, X } from 'lucide-react';
import { Button, Skeleton, toast } from '@/components/ui';
import {
  EmptyState,
  ErrorState,
  getErrorMessage,
  FormDialog,
  FieldText,
  FieldSelect,
  StatusBadge,
  DateCell,
} from '@/components/common';
import {
  useEmployeeTimeOff,
  useAddEmployeeTimeOff,
  useUpdateEmployeeTimeOff,
  useRemoveEmployeeTimeOff,
  type TimeOff,
} from '@/lib/hooks/employees';

const KIND_LABELS: Record<string, string> = {
  VACATION: 'Vacaciones',
  SICK: 'Baja médica',
  PERSONAL: 'Personal',
  OTHER: 'Otro',
};

const timeOffSchema = z
  .object({
    startAt: z.string().min(1, 'Obligatorio'),
    endAt: z.string().min(1, 'Obligatorio'),
    kind: z.string().min(1, 'Obligatorio'),
  })
  .refine((v) => new Date(v.endAt) >= new Date(v.startAt), {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['endAt'],
  });

export interface TimeOffTabProps {
  employeeId: string;
}

/** Pestaña Ausencias: vacaciones, bajas y permisos del profesional. */
export function TimeOffTab({ employeeId }: TimeOffTabProps): React.JSX.Element {
  const query = useEmployeeTimeOff(employeeId);
  const addTimeOff = useAddEmployeeTimeOff();
  const updateTimeOff = useUpdateEmployeeTimeOff();
  const removeTimeOff = useRemoveEmployeeTimeOff();
  const [formOpen, setFormOpen] = React.useState(false);

  const sorted = React.useMemo(
    () => [...(query.data ?? [])].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [query.data],
  );

  const setStatus = async (row: TimeOff, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
    try {
      await updateTimeOff.mutateAsync({ employeeId, timeOffId: row.id, data: { status } });
      toast({ title: status === 'APPROVED' ? 'Ausencia aprobada' : 'Ausencia rechazada', variant: 'success' });
    } catch (error) {
      toast({ title: 'No se pudo actualizar', description: getErrorMessage(error), variant: 'danger' });
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
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
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva ausencia
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={PalmtreeIcon}
          title="Sin ausencias registradas"
          description="Registra vacaciones, bajas médicas u otros permisos de este profesional."
          action={<Button onClick={() => setFormOpen(true)}>Nueva ausencia</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-brand-100/70 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{KIND_LABELS[row.kind] ?? row.kind}</p>
                <p className="text-xs text-ink-soft/70">
                  <DateCell value={row.startAt} /> — <DateCell value={row.endAt} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={row.status} />
                {row.status === 'PENDING' ? (
                  <>
                    <Button variant="ghost" size="icon" aria-label="Aprobar" onClick={() => setStatus(row, 'APPROVED')}>
                      <Check className="size-4 text-success" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Rechazar" onClick={() => setStatus(row, 'REJECTED')}>
                      <X className="size-4 text-danger" aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar ausencia"
                  onClick={async () => {
                    try {
                      await removeTimeOff.mutateAsync({ employeeId, timeOffId: row.id });
                      toast({ title: 'Ausencia eliminada', variant: 'success' });
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
        title="Nueva ausencia"
        schema={timeOffSchema}
        defaultValues={{ startAt: '', endAt: '', kind: 'VACATION' }}
        submitLabel="Registrar"
        onSubmit={async (values) => {
          await addTimeOff.mutateAsync({
            employeeId,
            data: {
              startAt: new Date(values.startAt).toISOString(),
              endAt: new Date(values.endAt).toISOString(),
              kind: values.kind as TimeOff['kind'],
            },
          });
          toast({ title: 'Ausencia registrada', variant: 'success' });
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <FieldText name="startAt" label="Desde" required type="date" />
          <FieldText name="endAt" label="Hasta" required type="date" />
        </div>
        <FieldSelect
          name="kind"
          label="Tipo"
          required
          options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </FormDialog>
    </div>
  );
}
