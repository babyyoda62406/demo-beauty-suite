'use client';

import * as React from 'react';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, LockKeyhole, LockOpen } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import {
  DataTable,
  FormDialog,
  FieldNumber,
  MoneyText,
  DateCell,
  StatusBadge,
  ErrorState,
} from '@/components/common';
import { formatDateTime } from '@/lib/format';
import {
  useCashSessions,
  useCloseCashSession,
  useCurrentCashSession,
  useOpenCashSession,
  type CashSession,
} from '@/lib/hooks/cash';

const openSchema = z.object({
  openingFloat: z.number({ invalid_type_error: 'Introduce el fondo inicial' }).min(0, 'No puede ser negativo'),
});
const closeSchema = z.object({
  closingAmount: z.number({ invalid_type_error: 'Introduce el efectivo contado' }).min(0, 'No puede ser negativo'),
});

/** Pestaña "Cierre de caja": apertura, cierre con conteo y diferencia (SPEC §6). */
export function CierreTab(): React.JSX.Element {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [closeDialog, setCloseDialog] = React.useState(false);

  const currentQuery = useCurrentCashSession();
  const sessionsQuery = useCashSessions();
  const openSession = useOpenCashSession();
  const closeSession = useCloseCashSession();

  const current = currentQuery.data;

  const columns = React.useMemo<ColumnDef<CashSession, unknown>[]>(
    () => [
      { accessorKey: 'openedAt', header: 'Apertura', cell: ({ row }) => <DateCell value={row.original.openedAt} withTime /> },
      { accessorKey: 'closedAt', header: 'Cierre', cell: ({ row }) => <DateCell value={row.original.closedAt} withTime /> },
      { accessorKey: 'status', header: 'Estado', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        accessorKey: 'openingFloat',
        header: 'Fondo inicial',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyText cents={row.original.openingFloat} currency={row.original.currency} />,
      },
      {
        accessorKey: 'expectedAmount',
        header: 'Esperado',
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.expectedAmount == null ? (
            <span className="text-ink-soft/40">—</span>
          ) : (
            <MoneyText cents={row.original.expectedAmount} currency={row.original.currency} />
          ),
      },
      {
        accessorKey: 'closingAmount',
        header: 'Contado',
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.closingAmount == null ? (
            <span className="text-ink-soft/40">—</span>
          ) : (
            <MoneyText cents={row.original.closingAmount} currency={row.original.currency} />
          ),
      },
      {
        accessorKey: 'difference',
        header: 'Diferencia',
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.difference == null ? (
            <span className="text-ink-soft/40">—</span>
          ) : (
            <MoneyText cents={row.original.difference} currency={row.original.currency} colored showSign />
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            {current ? (
              <LockOpen className="size-5 text-brand-500" aria-hidden="true" />
            ) : (
              <LockKeyhole className="size-5 text-ink-soft/60" aria-hidden="true" />
            )}
            Sesión de caja
          </CardTitle>
          {!currentQuery.isLoading && !currentQuery.error ? (
            current ? (
              <Button variant="danger" onClick={() => setCloseDialog(true)}>
                Cerrar caja
              </Button>
            ) : (
              <Button onClick={() => setOpenDialog(true)}>Abrir caja</Button>
            )
          ) : null}
        </CardHeader>
        <CardContent>
          {currentQuery.isLoading ? (
            <Skeleton className="h-16 w-full max-w-md" />
          ) : currentQuery.error ? (
            <ErrorState error={currentQuery.error} onRetry={() => currentQuery.refetch()} className="border-0 py-6" />
          ) : current ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft/60">Abierta desde</p>
                <p className="mt-1 text-sm text-ink">{formatDateTime(current.openedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft/60">Fondo inicial</p>
                <p className="mt-1 font-serif text-xl font-semibold text-ink">
                  <MoneyText cents={current.openingFloat} currency={current.currency} />
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft/60">Estado</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Caja abierta
                </p>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-soft/70">
              <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
              No hay ninguna sesión de caja abierta. Ábrela indicando el fondo inicial en efectivo.
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 font-serif text-lg font-semibold text-ink">Historial de sesiones</h3>
        <DataTable<CashSession>
          columns={columns}
          data={sessionsQuery.data ?? []}
          loading={sessionsQuery.isLoading}
          error={sessionsQuery.error}
          onRetry={() => sessionsQuery.refetch()}
          emptyTitle="Sin sesiones de caja"
          emptyDescription="El historial de aperturas y cierres aparecerá aquí."
        />
      </div>

      <FormDialog<typeof openSchema>
        open={openDialog}
        onOpenChange={setOpenDialog}
        title="Abrir caja"
        description="Indica el efectivo con el que arranca la caja hoy."
        schema={openSchema}
        defaultValues={{}}
        submitLabel="Abrir caja"
        onSubmit={async (values) => {
          await openSession.mutateAsync({ openingFloat: Math.round(values.openingFloat * 100) });
        }}
      >
        <FieldNumber<z.infer<typeof openSchema>> name="openingFloat" label="Fondo inicial" required suffix="€" step={0.01} min={0} />
      </FormDialog>

      <FormDialog<typeof closeSchema>
        open={closeDialog}
        onOpenChange={setCloseDialog}
        title="Cerrar caja"
        description="Cuenta el efectivo físico en el cajón. Calcularemos la diferencia frente a lo esperado."
        schema={closeSchema}
        defaultValues={{}}
        submitLabel="Cerrar caja"
        onSubmit={async (values) => {
          await closeSession.mutateAsync({ closingAmount: Math.round(values.closingAmount * 100) });
        }}
      >
        <FieldNumber<z.infer<typeof closeSchema>> name="closingAmount" label="Efectivo contado" required suffix="€" step={0.01} min={0} />
      </FormDialog>
    </div>
  );
}
