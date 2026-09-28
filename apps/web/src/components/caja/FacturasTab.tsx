'use client';

import * as React from 'react';
import { FileText, Send } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui';
import { TicketActions } from './TicketActions';
import { DataTable, Toolbar, MoneyCell, DateCell, StatusBadge } from '@/components/common';
import { cn } from '@/lib/utils';
import { useInvoices, useIssueInvoice, type Invoice, type InvoiceStatus } from '@/lib/hooks/cash';

const STATUS_OPTIONS: Array<{ value: InvoiceStatus | ''; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ISSUED', label: 'Emitida' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'VOID', label: 'Anulada' },
];

/** Pestaña "Facturas/Tickets": listado con numeración secuencial (SPEC §6). */
export function FacturasTab(): React.JSX.Element {
  const [status, setStatus] = React.useState<InvoiceStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const invoicesQuery = useInvoices({ page, pageSize, ...(status ? { status } : {}) });
  const issueInvoice = useIssueInvoice();

  const columns = React.useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      { accessorKey: 'number', header: 'Nº factura' },
      { accessorKey: 'issuedAt', header: 'Emisión', cell: ({ row }) => <DateCell value={row.original.issuedAt} /> },
      { accessorKey: 'status', header: 'Estado', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { accessorKey: 'items', header: 'Líneas', cell: ({ row }) => <span className="text-ink-soft">{row.original.items.length}</span> },
      {
        accessorKey: 'total',
        header: 'Total',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.total} currency={row.original.currency} />,
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'center' },
        cell: ({ row }) =>
          row.original.status === 'DRAFT' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => issueInvoice.mutate({ id: row.original.id })}
              disabled={issueInvoice.isPending}
            >
              <Send aria-hidden="true" />
              Emitir
            </Button>
          ) : (
            <TicketActions invoiceId={row.original.id} />
          ),
      },
    ],
    [issueInvoice],
  );

  const meta = invoicesQuery.data?.meta;

  return (
    <div className="space-y-4">
      <Toolbar
        start={
          <select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as InvoiceStatus | '');
              setPage(1);
            }}
            className={cn(
              'flex h-11 w-full max-w-xs appearance-none rounded-xl border border-brand-100 bg-white bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat px-4 py-2 pr-10 text-sm text-ink shadow-sm transition-colors',
              'focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
            )}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%239d0e4b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        }
      />

      <DataTable<Invoice>
        columns={columns}
        data={invoicesQuery.data?.data ?? []}
        loading={invoicesQuery.isLoading}
        error={invoicesQuery.error}
        onRetry={() => invoicesQuery.refetch()}
        emptyIcon={FileText}
        emptyTitle="Sin facturas todavía"
        emptyDescription="Las facturas emitidas desde el salón aparecerán aquí."
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
    </div>
  );
}
