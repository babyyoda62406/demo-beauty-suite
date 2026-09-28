'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { Archive, ArchiveRestore, Pencil, Plus, Scissors, Trash2 } from 'lucide-react';
import { Badge, Button, toast } from '@/components/ui';
import {
  PageHeader,
  DataTable,
  FormDialog,
  ConfirmDialog,
  FieldText,
  FieldNumber,
  FieldTextarea,
  FieldSelect,
  getErrorMessage,
} from '@/components/common';
import { FieldImageUpload } from '@/components/cms/field-image-upload';
import { FieldCheckbox } from '@/components/cms/field-checkbox';
import { mediaUrl } from '@/lib/media';
import { formatServicePrice } from '@/lib/format';
import {
  useServicesAdmin,
  useServiceCategories,
  useCreateService,
  useUpdateService,
  useDeleteService,
  type Service,
  type ServiceCategory,
  type ServiceInput,
} from '@/lib/hooks/catalog';

// -----------------------------------------------------------------------------
// Formulario de alta/edición
// -----------------------------------------------------------------------------

const serviceSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(160, 'Máximo 160 caracteres'),
  tagline: z.string().max(200, 'Máximo 200 caracteres').optional(),
  description: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
  priceEuros: z.coerce
    .number({ invalid_type_error: 'Introduce un precio (0 = «Consultar»)' })
    .min(0, 'No puede ser negativo'),
  durationMin: z.coerce
    .number({ invalid_type_error: 'Introduce la duración en minutos' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 minuto')
    .max(1440, 'Máximo 1440 minutos'),
  categoryId: z.string().optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  categories,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | undefined;
  categories: ServiceCategory[];
  onSubmit: (input: ServiceInput) => Promise<void>;
}): React.JSX.Element {
  const categoryOptions = React.useMemo(
    () => [
      { value: '', label: 'Sin categoría' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const defaultValues: ServiceFormValues = {
    name: service?.name ?? '',
    tagline: service?.tagline ?? '',
    description: service?.description ?? '',
    priceEuros: service ? service.price / 100 : 0,
    durationMin: service?.durationMin ?? 60,
    categoryId: service?.categoryId ?? '',
    active: service?.active ?? true,
    imageUrl: service?.imageUrl ?? '',
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
      description="El precio se introduce en euros; 0 se mostrará como «Consultar» en la web."
      schema={serviceSchema}
      defaultValues={defaultValues}
      submitLabel={service ? 'Guardar cambios' : 'Crear servicio'}
      onSubmit={async (values) => {
        await onSubmit({
          name: values.name,
          tagline: values.tagline ?? '',
          description: values.description ?? '',
          price: Math.round(values.priceEuros * 100),
          durationMin: values.durationMin,
          categoryId: values.categoryId ? values.categoryId : null,
          active: values.active ?? true,
          imageUrl: values.imageUrl ?? '',
        });
      }}
    >
      <FieldText<ServiceFormValues> name="name" label="Nombre" required placeholder="Uñas acrílicas esculpidas" />
      <FieldText<ServiceFormValues>
        name="tagline"
        label="Frase / gancho"
        description="Frase corta que se muestra en la tarjeta del servicio."
        placeholder="Diseños únicos para unas manos que no pasan desapercibidas."
      />
      <FieldTextarea<ServiceFormValues>
        name="description"
        label="Descripción"
        placeholder="Explica en qué consiste el servicio."
        rows={3}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldNumber<ServiceFormValues>
          name="priceEuros"
          label="Precio"
          description="0 = «Consultar»"
          min={0}
          step={0.01}
          suffix="€"
        />
        <FieldNumber<ServiceFormValues> name="durationMin" label="Duración" min={1} max={1440} step={5} suffix="min" />
      </div>

      <FieldSelect<ServiceFormValues> name="categoryId" label="Categoría" options={categoryOptions} />

      <FieldImageUpload<ServiceFormValues> name="imageUrl" label="Foto del servicio" aspect="video" />

      <FieldCheckbox<ServiceFormValues>
        name="active"
        label="Servicio activo"
        description="Si se desactiva, deja de mostrarse en la web (archivado)."
      />
    </FormDialog>
  );
}

// -----------------------------------------------------------------------------
// Página
// -----------------------------------------------------------------------------

/**
 * CMS · Servicios de la web pública. Alta/edición (foto incluida), archivar
 * (activar/desactivar) y eliminar. El precio se guarda en céntimos.
 */
export default function ServiciosPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Service | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Service | undefined>(undefined);

  const query = useServicesAdmin({ page, pageSize, sortBy: 'name', sortOrder: 'asc' });
  const categoriesQuery = useServiceCategories();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryName = React.useCallback(
    (id: string | null): string | null => (id ? (categories.find((c) => c.id === id)?.name ?? null) : null),
    [categories],
  );

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (service: Service): void => {
    setEditing(service);
    setFormOpen(true);
  };

  const toggleActive = async (service: Service): Promise<void> => {
    try {
      await updateService.mutateAsync({ id: service.id, data: { active: !service.active } });
      toast({ title: service.active ? 'Servicio archivado' : 'Servicio activado', variant: 'success' });
    } catch (error) {
      toast({ title: 'No se pudo actualizar', description: getErrorMessage(error), variant: 'danger' });
    }
  };

  const columns = React.useMemo<ColumnDef<Service, unknown>[]>(
    () => [
      {
        id: 'photo',
        header: '',
        cell: ({ row }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(row.original.imageUrl)}
            alt=""
            className="size-12 rounded-lg object-cover"
          />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Servicio',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.name}</p>
            {row.original.tagline ? (
              <p className="truncate text-xs text-ink-soft/70">{row.original.tagline}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Categoría',
        cell: ({ row }) => {
          const name = categoryName(row.original.categoryId);
          return name ? (
            <span className="text-sm text-ink-soft">{name}</span>
          ) : (
            <span className="text-sm text-ink-soft/50">—</span>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Precio',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-ink">
            {formatServicePrice(row.original.price, row.original.currency)}
          </span>
        ),
      },
      {
        id: 'active',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Activo' : 'Archivado'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={row.original.active ? `Archivar ${row.original.name}` : `Activar ${row.original.name}`}
              onClick={() => void toggleActive(row.original)}
            >
              {row.original.active ? (
                <Archive className="size-4" aria-hidden="true" />
              ) : (
                <ArchiveRestore className="size-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${row.original.name}`}
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${row.original.name}`}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-4 text-danger" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryName],
  );

  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios"
        description="Gestiona el catálogo de servicios que se muestra en tu web."
        icon={<Scissors className="size-6" aria-hidden="true" />}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Añadir servicio
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        emptyIcon={Scissors}
        emptyTitle="Sin servicios"
        emptyDescription="Añade tu primer servicio para mostrarlo en la web."
        emptyAction={<Button onClick={openCreate}>Añadir servicio</Button>}
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

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        categories={categories}
        onSubmit={async (input) => {
          if (editing) {
            await updateService.mutateAsync({ id: editing.id, data: input });
            toast({ title: 'Servicio actualizado', variant: 'success' });
          } else {
            await createService.mutateAsync(input);
            toast({ title: 'Servicio creado', variant: 'success' });
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(undefined)}
        title="Eliminar servicio"
        description={
          deleteTarget
            ? `¿Seguro que quieres eliminar «${deleteTarget.name}»? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteService.mutateAsync(deleteTarget.id);
            toast({ title: 'Servicio eliminado', variant: 'success' });
          } catch (error) {
            toast({ title: 'No se pudo eliminar', description: getErrorMessage(error), variant: 'danger' });
          } finally {
            setDeleteTarget(undefined);
          }
        }}
      />
    </div>
  );
}
