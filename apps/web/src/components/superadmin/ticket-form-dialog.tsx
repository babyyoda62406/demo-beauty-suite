'use client';

import * as React from 'react';
import { z } from 'zod';
import { FormDialog, FieldText, FieldTextarea, FieldSelect } from '@/components/common';
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type CreateTicketInput,
  type SupportTicket,
  type UpdateTicketInput,
} from '@/lib/hooks/superadmin';

const createSchema = z.object({
  tenantId: z.string().min(1, 'Selecciona un salón.'),
  subject: z.string().min(3, 'El asunto es demasiado corto.').max(200),
  description: z.string().min(3, 'Describe la incidencia.').max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

const editSchema = z.object({
  subject: z.string().min(3, 'El asunto es demasiado corto.').max(200),
  description: z.string().min(3, 'Describe la incidencia.').max(5000),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

const priorityOptions = TICKET_PRIORITIES.map((p) => ({ value: p, label: TICKET_PRIORITY_LABELS[p] }));
const statusOptions = TICKET_STATUSES.map((s) => ({ value: s, label: TICKET_STATUS_LABELS[s] }));

export interface TicketFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: SupportTicket | undefined;
  /** Salones para el selector (sólo en alta). */
  tenantOptions: { value: string; label: string }[];
  onCreate: (values: CreateTicketInput) => Promise<void>;
  onUpdate: (id: string, values: UpdateTicketInput) => Promise<void>;
}

/** Diálogo de alta/edición de incidencia de soporte (SUPERADMIN). */
export function TicketFormDialog({
  open,
  onOpenChange,
  ticket,
  tenantOptions,
  onCreate,
  onUpdate,
}: TicketFormDialogProps): React.JSX.Element {
  if (ticket) {
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Editar incidencia"
        description="Actualiza el estado, la prioridad o el contenido de la incidencia."
        schema={editSchema}
        defaultValues={{
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
        }}
        submitLabel="Guardar cambios"
        onSubmit={async (values) => {
          await onUpdate(ticket.id, values);
        }}
      >
        <FieldText name="subject" label="Asunto" required />
        <FieldTextarea name="description" label="Descripción" rows={5} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSelect name="status" label="Estado" options={statusOptions} />
          <FieldSelect name="priority" label="Prioridad" options={priorityOptions} />
        </div>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva incidencia"
      description="Abre una incidencia de soporte para un salón."
      schema={createSchema}
      defaultValues={{
        tenantId: tenantOptions[0]?.value ?? '',
        subject: '',
        description: '',
        priority: 'MEDIUM',
      }}
      submitLabel="Abrir incidencia"
      onSubmit={async (values) => {
        await onCreate(values);
      }}
    >
      <FieldSelect
        name="tenantId"
        label="Salón"
        options={tenantOptions}
        placeholder="Selecciona un salón"
        required
      />
      <FieldText name="subject" label="Asunto" placeholder="No puedo acceder a la agenda" required />
      <FieldTextarea
        name="description"
        label="Descripción"
        rows={5}
        placeholder="Describe qué ocurre, pasos para reproducirlo, etc."
        required
      />
      <FieldSelect name="priority" label="Prioridad" options={priorityOptions} />
    </FormDialog>
  );
}
