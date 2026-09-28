'use client';

import * as React from 'react';
import { z } from 'zod';
import { PlusCircle, ReceiptText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Badge } from '@/components/ui';
import {
  DataTable,
  Toolbar,
  FormDialog,
  FieldNumber,
  FieldSelect,
  MoneyCell,
  DateCell,
  type SelectOption,
} from '@/components/common';
import { formatTime } from '@/lib/format';
import {
  useClientOptions,
  useCreatePayment,
  usePayments,
  useTodayBookingOptions,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from '@/lib/hooks/cash';

const METHOD_OPTIONS: SelectOption[] = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATUS_OPTIONS: SelectOption[] = Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const paymentSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Introduce un importe' })
    .positive('El importe debe ser mayor que 0'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'STRIPE', 'GIFTCARD', 'VOUCHER']),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  clientId: z.string().optional(),
  bookingId: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Pestaña "Cobros": registro rápido de pagos y listado del día. */
export function CobrosTab(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const paymentsQuery = usePayments({ page, pageSize });
  const createPayment = useCreatePayment();
  const clientsQuery = useClientOptions();
  const bookingsQuery = useTodayBookingOptions(todayIso());

  const clientOptions: SelectOption[] = (clientsQuery.data?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.name} · ${c.phone}`,
  }));
  const bookingOptions: SelectOption[] = (bookingsQuery.data?.data ?? []).map((b) => ({
    value: b.id,
    label: `Cita ${formatTime(b.startAt)}`,
  }));

  const columns = React.useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Hora',
        cell: ({ row }) => <DateCell value={row.original.createdAt} withTime />,
      },
      {
        accessorKey: 'method',
        header: 'Método',
        cell: ({ row }) => (
          <Badge variant="neutral">{PAYMENT_METHOD_LABELS[row.original.method]}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.original.status;
          const variant =
            status === 'PAID' ? 'success' : status === 'PENDING' ? 'warning' : status === 'REFUNDED' ? 'neutral' : 'danger';
          return <Badge variant={variant}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
        },
      },
      {
        accessorKey: 'clientId',
        header: 'Referencia',
        cell: ({ row }) =>
          row.original.clientId ? (
            <span className="text-ink-soft">Clienta {row.original.clientId.slice(-6)}</span>
          ) : row.original.bookingId ? (
            <span className="text-ink-soft">Cita {row.original.bookingId.slice(-6)}</span>
          ) : (
            <span className="text-ink-soft/40">—</span>
          ),
      },
      {
        accessorKey: 'amount',
        header: 'Importe',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.amount} currency={row.original.currency} colored />,
      },
    ],
    [],
  );

  const meta = paymentsQuery.data?.meta;

  return (
    <div className="space-y-4">
      <Toolbar
        start={<p className="text-sm text-ink-soft/70">Cobros registrados hoy y anteriores.</p>}
        end={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusCircle aria-hidden="true" />
            Registrar cobro
          </Button>
        }
      />

      <DataTable<Payment>
        columns={columns}
        data={paymentsQuery.data?.data ?? []}
        loading={paymentsQuery.isLoading}
        error={paymentsQuery.error}
        onRetry={() => paymentsQuery.refetch()}
        emptyIcon={ReceiptText}
        emptyTitle="Todavía no hay cobros"
        emptyDescription="Registra el primer cobro del día con el botón «Registrar cobro»."
        {...(meta
          ? {
              pagination: {
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                totalPages: meta.totalPages,
                onPageChange: setPage,
              },
            }
          : {})}
      />

      <FormDialog<typeof paymentSchema>
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Registrar cobro"
        description="Anota el importe cobrado y su método de pago."
        schema={paymentSchema}
        defaultValues={{
          method: 'CASH' as PaymentMethod,
          status: 'PAID' as PaymentStatus,
          clientId: '',
          bookingId: '',
        }}
        submitLabel="Registrar"
        onSubmit={async (values: PaymentFormValues) => {
          await createPayment.mutateAsync({
            amount: Math.round(values.amount * 100),
            method: values.method,
            ...(values.status ? { status: values.status } : {}),
            ...(values.clientId ? { clientId: values.clientId } : {}),
            ...(values.bookingId ? { bookingId: values.bookingId } : {}),
          });
        }}
      >
        <FieldNumber<PaymentFormValues> name="amount" label="Importe" required suffix="€" step={0.01} min={0.01} />
        <FieldSelect<PaymentFormValues> name="method" label="Método de pago" required options={METHOD_OPTIONS} />
        <FieldSelect<PaymentFormValues> name="status" label="Estado" options={STATUS_OPTIONS} />
        <FieldSelect<PaymentFormValues>
          name="clientId"
          label="Clienta (opcional)"
          options={clientOptions}
          placeholder="Sin asociar"
        />
        <FieldSelect<PaymentFormValues>
          name="bookingId"
          label="Cita de hoy (opcional)"
          options={bookingOptions}
          placeholder="Sin asociar"
        />
      </FormDialog>
    </div>
  );
}
