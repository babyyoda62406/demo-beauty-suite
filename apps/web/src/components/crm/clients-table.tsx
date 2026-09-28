'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  CalendarHeart,
  Gift,
  Instagram,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@/components/ui';
import {
  ConfirmDialog,
  DataTable,
  getErrorMessage,
  SearchInput,
  Toolbar,
  type DataTablePagination,
} from '@/components/common';
import { formatDate } from '@/lib/format';
import {
  useClients,
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
  type Client,
  type ClientInput,
} from '@/lib/hooks/clients';
import { ClientAvatar } from './client-avatar';
import { ClientFormDialog } from './client-form-dialog';

const PAGE_SIZE = 20;

/** Traduce el estado de orden de la tabla al `sortBy`/`sortOrder` de la API. */
function sortParams(sorting: SortingState): { sortBy?: string; sortOrder?: 'asc' | 'desc' } {
  const first = sorting[0];
  if (!first) return {};
  return { sortBy: first.id, sortOrder: first.desc ? 'desc' : 'asc' };
}

/**
 * Listado de clientas: búsqueda con debounce, tabla paginada del servidor,
 * alta/edición en diálogo y baja con confirmación. Es la superficie principal
 * del CRM (SPEC §9).
 */
export function ClientsTable(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | undefined>(undefined);
  const [deleting, setDeleting] = React.useState<Client | undefined>(undefined);

  const query = useClients({ page, pageSize: PAGE_SIZE, search, ...sortParams(sorting) });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  // Al cambiar la búsqueda, volver a la primera página.
  const handleSearch = React.useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (client: Client): void => {
    setEditing(client);
    setFormOpen(true);
  };

  const handleSubmit = async (values: ClientInput): Promise<void> => {
    if (editing) {
      await updateClient.mutateAsync({ id: editing.id, data: values });
      toast({ variant: 'success', title: 'Clienta actualizada', description: values.name });
    } else {
      const created = await createClient.mutateAsync(values);
      toast({ variant: 'success', title: 'Clienta creada', description: created.name });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deleteClient.mutateAsync(deleting.id);
      toast({ variant: 'success', title: 'Clienta eliminada', description: deleting.name });
    } catch (error) {
      toast({
        variant: 'danger',
        title: 'No se pudo eliminar',
        description: getErrorMessage(error),
      });
    } finally {
      setDeleting(undefined);
    }
  };

  const columns = React.useMemo<ColumnDef<Client, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Clienta',
        enableSorting: true,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <ClientAvatar name={c.name} photoUrl={c.photoUrl} />
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{c.name}</p>
                <p className="truncate text-xs text-ink-soft/70">
                  {c.email ?? (c.instagram ? (
                    <span className="inline-flex items-center gap-1">
                      <Instagram className="size-3" aria-hidden="true" />
                      {c.instagram}
                    </span>
                  ) : (
                    'Sin correo'
                  ))}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'phone',
        header: 'Teléfono',
        enableSorting: false,
        cell: ({ row }) => (
          <a
            href={`tel:${row.original.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <Phone className="size-3.5 text-ink-soft/50" aria-hidden="true" />
            <span className="tabular-nums">{row.original.phone}</span>
          </a>
        ),
      },
      {
        id: 'birthDate',
        header: 'Cumpleaños',
        enableSorting: true,
        cell: ({ row }) =>
          row.original.birthDate ? (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <CalendarHeart className="size-3.5 text-brand-400" aria-hidden="true" />
              {formatDate(row.original.birthDate, 'd MMM')}
            </span>
          ) : (
            <span className="text-ink-soft/40">—</span>
          ),
      },
      // La columna «Puntos» mostraba `loyaltyPoints`, un contador que no
      // incrementa nadie: siempre enseñaba el valor de origen y hacía pensar
      // que ahí estaban los sellos. Los sellos de verdad viven en Fidelización.
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Acciones de ${c.name}`}>
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openEdit(c)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-danger focus:text-danger"
                    onSelect={() => setDeleting(c)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [],
  );

  const pagination: DataTablePagination | undefined = meta
    ? {
        page: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
        totalPages: meta.totalPages,
        onPageChange: setPage,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <Toolbar
        start={
          <SearchInput
            defaultValue={search}
            onSearch={handleSearch}
            placeholder="Buscar por nombre, teléfono o correo…"
            aria-label="Buscar clientas"
          />
        }
        end={
          <Button onClick={openCreate}>
            <UserPlus aria-hidden="true" />
            Nueva clienta
          </Button>
        }
      />

      <DataTable<Client>
        columns={columns}
        data={rows}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => router.push(`/salon/clientas/${row.id}`)}
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        {...(pagination ? { pagination } : {})}
        emptyIcon={search ? Users : Gift}
        emptyTitle={search ? 'Sin coincidencias' : 'Aún no hay clientas'}
        emptyDescription={
          search
            ? 'Prueba con otro nombre, teléfono o correo.'
            : 'Crea la primera ficha para empezar a fidelizar.'
        }
        emptyAction={
          !search ? (
            <Button onClick={openCreate} size="sm">
              <UserPlus aria-hidden="true" />
              Nueva clienta
            </Button>
          ) : null
        }
      />

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Eliminar clienta"
        description={
          deleting ? (
            <>
              ¿Seguro que quieres eliminar la ficha de <strong>{deleting.name}</strong>? Esta acción
              no se puede deshacer.
            </>
          ) : null
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
