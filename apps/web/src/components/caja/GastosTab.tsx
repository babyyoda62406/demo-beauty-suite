'use client';

import * as React from 'react';
import { z } from 'zod';
import { MoreHorizontal, Pencil, PlusCircle, Trash2, Wallet } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  DataTable,
  Toolbar,
  SearchInput,
  FormDialog,
  ConfirmDialog,
  FieldText,
  FieldNumber,
  FieldTextarea,
  MoneyCell,
  DateCell,
} from '@/components/common';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
  type Expense,
} from '@/lib/hooks/cash';

const expenseSchema = z.object({
  category: z.string().min(1, 'Indica una categoría').max(120),
  amount: z.number({ invalid_type_error: 'Introduce un importe' }).min(0, 'El importe no puede ser negativo'),
  description: z.string().max(500).optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

/** Pestaña "Gastos": alta, edición y baja de gastos del salón. */
export function GastosTab(): React.JSX.Element {
  const [category, setCategory] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleting, setDeleting] = React.useState<Expense | null>(null);

  const expensesQuery = useExpenses({ page, pageSize, ...(category ? { category } : {}) });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const columns = React.useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      { accessorKey: 'date', header: 'Fecha', cell: ({ row }) => <DateCell value={row.original.date} /> },
      { accessorKey: 'category', header: 'Categoría' },
      {
        accessorKey: 'description',
        header: 'Descripción',
        cell: ({ row }) => (
          <span className="text-ink-soft">{row.original.description ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Importe',
        meta: { align: 'right' },
        cell: ({ row }) => <MoneyCell cents={row.original.amount} currency={row.original.currency} />,
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9" aria-label="Acciones del gasto">
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(row.original)}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setDeleting(row.original)}
                className="text-danger focus:bg-danger/10 focus:text-danger"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const meta = expensesQuery.data?.meta;

  return (
    <div className="space-y-4">
      <Toolbar
        start={
          <SearchInput
            placeholder="Filtrar por categoría…"
            defaultValue={category}
            onSearch={(value) => {
              setCategory(value);
              setPage(1);
            }}
          />
        }
        end={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircle aria-hidden="true" />
            Registrar gasto
          </Button>
        }
      />

      <DataTable<Expense>
        columns={columns}
        data={expensesQuery.data?.data ?? []}
        loading={expensesQuery.isLoading}
        error={expensesQuery.error}
        onRetry={() => expensesQuery.refetch()}
        emptyIcon={Wallet}
        emptyTitle="Sin gastos registrados"
        emptyDescription="Registra el primer gasto del salón con el botón «Registrar gasto»."
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

      <FormDialog<typeof expenseSchema>
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Registrar gasto"
        schema={expenseSchema}
        defaultValues={{ category: '', description: '' }}
        submitLabel="Registrar"
        onSubmit={async (values: ExpenseFormValues) => {
          await createExpense.mutateAsync({
            category: values.category,
            amount: Math.round(values.amount * 100),
            ...(values.description ? { description: values.description } : {}),
          });
        }}
      >
        <FieldText<ExpenseFormValues> name="category" label="Categoría" required placeholder="Material, suministros…" />
        <FieldNumber<ExpenseFormValues> name="amount" label="Importe" required suffix="€" step={0.01} min={0} />
        <FieldTextarea<ExpenseFormValues> name="description" label="Descripción (opcional)" rows={3} />
      </FormDialog>

      <FormDialog<typeof expenseSchema>
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Editar gasto"
        schema={expenseSchema}
        defaultValues={{
          category: editing?.category ?? '',
          ...(editing ? { amount: editing.amount / 100 } : {}),
          description: editing?.description ?? '',
        }}
        submitLabel="Guardar cambios"
        onSubmit={async (values: ExpenseFormValues) => {
          if (!editing) return;
          await updateExpense.mutateAsync({
            id: editing.id,
            category: values.category,
            amount: Math.round(values.amount * 100),
            ...(values.description ? { description: values.description } : {}),
          });
        }}
      >
        <FieldText<ExpenseFormValues> name="category" label="Categoría" required />
        <FieldNumber<ExpenseFormValues> name="amount" label="Importe" required suffix="€" step={0.01} min={0} />
        <FieldTextarea<ExpenseFormValues> name="description" label="Descripción (opcional)" rows={3} />
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar gasto"
        description={
          deleting ? `Se eliminará el gasto de «${deleting.category}». Esta acción no se puede deshacer.` : undefined
        }
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteExpense.mutateAsync({ id: deleting.id });
        }}
      />
    </div>
  );
}
