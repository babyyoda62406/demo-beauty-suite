'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui';
import { Toolbar, DataTable, MoneyCell, DateCell, StatusCell } from '@/components/common';
import { useOrders, type Order, type OrderStatus } from '@/lib/hooks/store';
import { OrderDetailDrawer } from './OrderDetailDrawer';

/** Opciones de filtro de estado (vacío = todos). */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'PROCESSING', label: 'Procesando' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'REFUNDED', label: 'Reembolsado' },
];

/** Pestaña Pedidos: tabla de pedidos de la tienda con filtro de estado y detalle. */
export function OrdersTab(): React.JSX.Element {
  const [status, setStatus] = React.useState<OrderStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Order | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pageSize = 10;

  const query = useOrders({
    page,
    pageSize,
    sortOrder: 'desc',
    ...(status ? { status } : {}),
  });

  const openDetail = (order: Order): void => {
    setSelected(order);
    setDrawerOpen(true);
  };

  const columns = React.useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        id: 'id',
        header: 'Pedido',
        cell: ({ row }) => <span className="font-mono text-xs text-ink-soft">#{row.original.id.slice(0, 8)}</span>,
      },
      {
        id: 'client',
        header: 'Clienta',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.client?.name ?? 'Sin clienta'}</p>
            {row.original.client?.phone ? (
              <p className="truncate text-xs text-ink-soft/70">{row.original.client.phone}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'items',
        header: 'Artículos',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className="tabular-nums text-ink-soft">
            {row.original.items.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.total} currency={row.original.currency} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Fecha',
        cell: ({ row }) => <DateCell value={row.original.createdAt} withTime />,
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusCell status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Ver pedido #${row.original.id.slice(0, 8)}`}
              onClick={() => openDetail(row.original)}
            >
              <Eye className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      <Toolbar
        start={
          <label className="block w-56">
            <span className="sr-only">Filtrar por estado</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | '');
                setPage(1);
              }}
              className="flex h-11 w-full appearance-none rounded-xl border border-brand-100 bg-white bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat px-4 py-2 pr-10 text-sm text-ink shadow-sm transition-colors focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
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
          </label>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        onRowClick={openDetail}
        emptyIcon={PackageSearch}
        emptyTitle="Sin pedidos"
        emptyDescription="Todavía no hay pedidos de la tienda online con este filtro."
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

      <OrderDetailDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelected(undefined);
        }}
        order={selected}
      />
    </div>
  );
}
