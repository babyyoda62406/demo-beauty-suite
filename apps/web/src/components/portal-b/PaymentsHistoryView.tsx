'use client';

import * as React from 'react';
import { CreditCard, Download, FileText, Receipt } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { DataTable, MoneyCell, DateCell, StatusBadge } from '@/components/common';
import {
  useMyPayments,
  useMyInvoices,
  PAYMENT_METHOD_LABELS,
  type Payment,
  type Invoice,
} from '@/lib/hooks/cash';

const PAGE_SIZE = 10;

/**
 * Historial de pagos y facturas de la clienta (`/portal/pagos`).
 *
 * Datos vía `usePayments`/`useInvoices` (`@/lib/hooks/cash`, ya existentes,
 * mismas rutas que usa Caja del salón: `GET /payments`, `GET /invoices`).
 *
 * NOTA (gap de backend): ambos endpoints están gateados a
 * `OWNER`/`MANAGER`/`EMPLOYEE` en `payments.controller.ts` /
 * `invoices.controller.ts`; no hay una variante de auto-servicio para el rol
 * `CLIENT` ni un filtro por la clienta autenticada. Hasta que el backend
 * añada ese acceso, esta vista mostrará el estado de error de la API (403)
 * en vez de datos reales para una sesión de clienta.
 */
export function PaymentsHistoryView(): React.JSX.Element {
  const [paymentsPage, setPaymentsPage] = React.useState(1);
  const [invoicesPage, setInvoicesPage] = React.useState(1);

  const paymentsQuery = useMyPayments({ page: paymentsPage, pageSize: PAGE_SIZE });
  const invoicesQuery = useMyInvoices({ page: invoicesPage, pageSize: PAGE_SIZE });

  const paymentColumns = React.useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Fecha',
        cell: ({ row }) => <DateCell value={row.original.createdAt} withTime />,
      },
      {
        accessorKey: 'method',
        header: 'Método',
        cell: ({ row }) => (
          <span className="text-ink-soft">{PAYMENT_METHOD_LABELS[row.original.method]}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'amount',
        header: 'Importe',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.amount} currency={row.original.currency} />,
      },
    ],
    [],
  );

  const invoiceColumns = React.useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      { accessorKey: 'number', header: 'Nº factura' },
      {
        accessorKey: 'issuedAt',
        header: 'Emisión',
        cell: ({ row }) => <DateCell value={row.original.issuedAt} />,
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'total',
        header: 'Total',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.total} currency={row.original.currency} />,
      },
      {
        id: 'download',
        header: '',
        meta: { align: 'center' },
        cell: ({ row }) =>
          row.original.pdfUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={row.original.pdfUrl} target="_blank" rel="noreferrer" download>
                <Download aria-hidden="true" />
                Descargar
              </a>
            </Button>
          ) : (
            <span className="text-xs text-ink-soft/40">Sin PDF</span>
          ),
      },
    ],
    [],
  );

  const paymentsMeta = paymentsQuery.data?.meta;
  const invoicesMeta = invoicesQuery.data?.meta;

  return (
    <Tabs defaultValue="pagos">
      <TabsList>
        <TabsTrigger value="pagos" className="gap-1.5">
          <CreditCard className="size-4" aria-hidden="true" />
          Pagos
        </TabsTrigger>
        <TabsTrigger value="facturas" className="gap-1.5">
          <FileText className="size-4" aria-hidden="true" />
          Facturas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pagos">
        <DataTable<Payment>
          columns={paymentColumns}
          data={paymentsQuery.data?.data ?? []}
          loading={paymentsQuery.isLoading}
          error={paymentsQuery.error}
          onRetry={() => paymentsQuery.refetch()}
          emptyIcon={Receipt}
          emptyTitle="Todavía no hay pagos"
          emptyDescription="Cuando registremos un cobro de tus servicios, aparecerá aquí."
          {...(paymentsMeta
            ? {
                pagination: {
                  page: paymentsMeta.page,
                  pageSize: paymentsMeta.pageSize,
                  total: paymentsMeta.total,
                  totalPages: paymentsMeta.totalPages,
                  onPageChange: setPaymentsPage,
                },
              }
            : {})}
        />
      </TabsContent>

      <TabsContent value="facturas">
        <DataTable<Invoice>
          columns={invoiceColumns}
          data={invoicesQuery.data?.data ?? []}
          loading={invoicesQuery.isLoading}
          error={invoicesQuery.error}
          onRetry={() => invoicesQuery.refetch()}
          emptyIcon={FileText}
          emptyTitle="Todavía no hay facturas"
          emptyDescription="Tus facturas emitidas aparecerán aquí con opción de descarga en PDF."
          {...(invoicesMeta
            ? {
                pagination: {
                  page: invoicesMeta.page,
                  pageSize: invoicesMeta.pageSize,
                  total: invoicesMeta.total,
                  totalPages: invoicesMeta.totalPages,
                  onPageChange: setInvoicesPage,
                },
              }
            : {})}
        />
      </TabsContent>
    </Tabs>
  );
}
