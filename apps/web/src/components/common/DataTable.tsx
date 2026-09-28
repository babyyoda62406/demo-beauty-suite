'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Pagination } from './Pagination';

/** Paginación controlada por el servidor. */
export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Click de fila (abre ficha/detalle). Aplica estilos de fila interactiva. */
  onRowClick?: (row: T) => void;
  /** Id estable de fila (por defecto índice). */
  getRowId?: (row: T, index: number) => string;

  // Estado vacío
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;

  // Ordenación (controlada = servidor; si se omite, es cliente)
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;

  /** Paginación de servidor; si se omite no se pagina. */
  pagination?: DataTablePagination;

  /** Nº de filas skeleton durante la carga inicial. */
  loadingRows?: number;
  className?: string;
  /** Cabecera pegajosa al hacer scroll vertical. */
  stickyHeader?: boolean;
}

/**
 * Tabla de datos de marca sobre @tanstack/react-table. Ordenación (cliente o
 * servidor), paginación de servidor opcional, y estados de carga / vacío /
 * error integrados. Accesible: cabeceras `scope=col`, orden vía botón con
 * `aria-sort`.
 */
export function DataTable<T>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  onRowClick,
  getRowId,
  emptyTitle = 'Sin resultados',
  emptyDescription = 'No hay elementos que mostrar por ahora.',
  emptyIcon,
  emptyAction,
  sorting,
  onSortingChange,
  manualSorting = false,
  pagination,
  loadingRows = 6,
  className,
  stickyHeader = false,
}: DataTableProps<T>): React.JSX.Element {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const isControlledSort = sorting !== undefined;
  const sortingChange: OnChangeFn<SortingState> | undefined = isControlledSort
    ? onSortingChange
    : setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    state: { sorting: isControlledSort ? sorting : internalSorting },
    ...(sortingChange ? { onSortingChange: sortingChange } : {}),
    getCoreRowModel: getCoreRowModel(),
    ...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
    manualSorting,
    manualPagination: true,
    ...(getRowId ? { getRowId } : {}),
  });

  const columnCount = columns.length;

  /** Etiqueta legible de una columna, para las tarjetas del móvil. */
  const etiquetaDe = (columnId: string): string => {
    const def = columns.find((c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) === columnId);
    const header = def?.header;
    return typeof header === 'string' ? header : '';
  };

  const filas = table.getRowModel().rows;

  return (
    <div className={cn('space-y-4', className)}>
      {/* --- Móvil: cada fila es una tarjeta ---------------------------------
          Una tabla de 5-6 columnas en 390 px deja fuera de la pantalla los
          datos y los botones de acción: en Clientas no se veían ni el teléfono
          entero, ni los puntos, ni editar/eliminar. Apilada se lee todo. */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: Math.min(loadingRows, 4) }).map((_, r) => (
            <div key={`msk-${r}`} className="rounded-2xl border border-brand-100/70 bg-white p-4 shadow-card">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-3 w-3/4" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : filas.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        ) : (
          filas.map((row: Row<T>) => {
            const celdas = row.getVisibleCells();
            const principal = celdas[0];
            // Las columnas sin encabezado son de acciones: van juntas al pie.
            const acciones = celdas.filter((c) => c.column.id !== principal?.column.id && !etiquetaDe(c.column.id));
            const datos = celdas.filter((c) => c.column.id !== principal?.column.id && etiquetaDe(c.column.id));
            return (
              <div
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  'rounded-2xl border border-brand-100/70 bg-white p-4 shadow-card',
                  onRowClick && 'cursor-pointer active:bg-brand-50/50',
                )}
              >
                {principal ? (
                  <div className="text-ink">
                    {flexRender(principal.column.columnDef.cell, principal.getContext())}
                  </div>
                ) : null}

                {datos.length > 0 ? (
                  <dl className="mt-3 space-y-1.5 border-t border-brand-50 pt-3">
                    {datos.map((cell) => (
                      <div key={cell.id} className="flex items-start justify-between gap-3">
                        <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-soft/70">
                          {etiquetaDe(cell.column.id)}
                        </dt>
                        <dd className="min-w-0 text-right text-sm text-ink">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {acciones.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-brand-50 pt-2">
                    {acciones.map((cell) => (
                      <React.Fragment key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </React.Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* --- Escritorio: la tabla de siempre -------------------------------- */}
      <div className="hidden overflow-x-auto rounded-2xl border border-brand-100/70 bg-white shadow-card md:block">
        <table className="w-full border-collapse text-sm">
          <thead className={cn('bg-surface-subtle/60', stickyHeader && 'sticky top-0 z-10')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-brand-100/70">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const align = (header.column.columnDef.meta as { align?: string } | undefined)?.align;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : canSort ? 'none' : undefined
                      }
                      className={cn(
                        'px-4 py-3 text-left align-middle font-medium text-ink-soft/80',
                        align === 'right' && 'text-right',
                        align === 'center' && 'text-center',
                      )}
                      style={header.getSize() !== 150 ? { width: header.getSize() } : undefined}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'group inline-flex items-center gap-1.5 rounded transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
                            align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5 text-brand-500" aria-hidden="true" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5 text-brand-500" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown
                              className="size-3.5 text-ink-soft/40 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, r) => (
                <tr key={`sk-${r}`} className="border-b border-brand-50">
                  {Array.from({ length: columnCount }).map((__, c) => (
                    <td key={`sk-${r}-${c}`} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-[8rem]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columnCount} className="p-0">
                  <ErrorState error={error} onRetry={onRetry} className="border-0" />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    className="border-0"
                  />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: Row<T>) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'border-b border-brand-50 transition-colors last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-brand-50/50 focus-within:bg-brand-50/50',
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-4 py-3.5 align-middle text-ink',
                          align === 'right' && 'text-right',
                          align === 'center' && 'text-center',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && !error ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      ) : null}
    </div>
  );
}
