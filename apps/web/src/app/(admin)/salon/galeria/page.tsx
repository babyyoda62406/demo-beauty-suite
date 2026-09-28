'use client';

import * as React from 'react';
import { z } from 'zod';
import { Images, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Skeleton, toast } from '@/components/ui';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  FormDialog,
  ConfirmDialog,
  FieldText,
  FieldSelect,
  getErrorMessage,
} from '@/components/common';
import { FieldImageUpload } from '@/components/cms/field-image-upload';
import { FieldCheckbox } from '@/components/cms/field-checkbox';
import { mediaUrl } from '@/lib/media';
import {
  useGalleryManage,
  useCreateGalleryItem,
  useUpdateGalleryItem,
  useDeleteGalleryItem,
  type GalleryItem,
  type GalleryItemInput,
} from '@/lib/hooks/gallery';

/** Categorías de la galería (brief 2026-08-03), con etiqueta legible. */
const GALLERY_CATEGORIES = [
  { value: 'acrilicas', label: 'Uñas acrílicas' },
  { value: 'natural', label: 'Uña natural' },
  { value: 'manicura', label: 'Manicura' },
  { value: 'pedicura', label: 'Pedicura' },
  { value: 'spa', label: 'Pedi Spa' },
  { value: 'disenos', label: 'Diseños' },
  { value: 'antesDespues', label: 'Antes y después' },
] as const;

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  GALLERY_CATEGORIES.map((c) => [c.value, c.label]),
);

// -----------------------------------------------------------------------------
// Formulario de alta/edición
// -----------------------------------------------------------------------------

const gallerySchema = z.object({
  url: z.string().min(1, 'Sube una foto'),
  category: z.string().min(1, 'Elige una categoría'),
  caption: z.string().max(200, 'Máximo 200 caracteres').optional(),
  isBeforeAfter: z.boolean().optional(),
});

type GalleryFormValues = z.infer<typeof gallerySchema>;

function GalleryFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: GalleryItem | undefined;
  onSubmit: (input: GalleryItemInput) => Promise<void>;
}): React.JSX.Element {
  const defaultValues: GalleryFormValues = {
    url: item?.url ?? '',
    category: item?.category ?? 'acrilicas',
    caption: item?.caption ?? '',
    isBeforeAfter: item?.isBeforeAfter ?? false,
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? 'Editar foto' : 'Añadir foto'}
      description="Sube una foto de tu trabajo y elige su categoría."
      schema={gallerySchema}
      defaultValues={defaultValues}
      submitLabel={item ? 'Guardar cambios' : 'Añadir foto'}
      onSubmit={async (values) => {
        await onSubmit({
          url: values.url,
          category: values.category,
          caption: values.caption ?? '',
          isBeforeAfter: values.isBeforeAfter ?? false,
        });
      }}
    >
      <FieldImageUpload<GalleryFormValues> name="url" label="Foto" aspect="portrait" />
      <FieldSelect<GalleryFormValues> name="category" label="Categoría" options={[...GALLERY_CATEGORIES]} />
      <FieldText<GalleryFormValues> name="caption" label="Pie de foto" placeholder="Uñas acrílicas rosas con diseño floral" />
      <FieldCheckbox<GalleryFormValues>
        name="isBeforeAfter"
        label="Es un antes y después"
        description="Márcalo si la foto muestra el resultado frente al estado inicial."
      />
    </FormDialog>
  );
}

// -----------------------------------------------------------------------------
// Página
// -----------------------------------------------------------------------------

/**
 * CMS · Galería de la web pública. Subida de fotos (categoría, pie, antes/
 * después), edición y borrado. Las imágenes se resuelven con `mediaUrl`.
 */
export default function GaleriaPage(): React.JSX.Element {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GalleryItem | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<GalleryItem | undefined>(undefined);

  const query = useGalleryManage({ pageSize: 100 });
  const createItem = useCreateGalleryItem();
  const updateItem = useUpdateGalleryItem();
  const deleteItem = useDeleteGalleryItem();

  const items = query.data?.data ?? [];

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (item: GalleryItem): void => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Galería"
        description="Sube y organiza las fotos de tus trabajos que se ven en la web."
        icon={<Images className="size-6" aria-hidden="true" />}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Añadir foto
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Sin fotos"
          description="Añade la primera foto de tu trabajo para llenar la galería."
          action={<Button onClick={openCreate}>Añadir foto</Button>}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-brand-100/70 bg-white shadow-card"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(item.url)}
                  alt={item.caption ?? ''}
                  className="size-full object-cover"
                />
                {item.isBeforeAfter ? (
                  <Badge variant="solid" className="absolute left-2 top-2">
                    Antes/después
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.category ? (CATEGORY_LABEL[item.category] ?? item.category) : 'Sin categoría'}
                  </p>
                  {item.caption ? (
                    <p className="truncate text-xs text-ink-soft/70">{item.caption}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar foto"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar foto"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="size-4 text-danger" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <GalleryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        onSubmit={async (input) => {
          if (editing) {
            await updateItem.mutateAsync({ id: editing.id, data: input });
            toast({ title: 'Foto actualizada', variant: 'success' });
          } else {
            await createItem.mutateAsync(input);
            toast({ title: 'Foto añadida', variant: 'success' });
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(undefined)}
        title="Eliminar foto"
        description="¿Seguro que quieres eliminar esta foto de la galería? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteItem.mutateAsync(deleteTarget.id);
            toast({ title: 'Foto eliminada', variant: 'success' });
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
