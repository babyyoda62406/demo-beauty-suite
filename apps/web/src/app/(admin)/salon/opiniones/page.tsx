'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { Eye, EyeOff, MessageSquareQuote, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Badge, Button, toast } from '@/components/ui';
import {
  PageHeader,
  DataTable,
  FormDialog,
  ConfirmDialog,
  FieldText,
  FieldNumber,
  FieldTextarea,
  getErrorMessage,
} from '@/components/common';
import { FieldCheckbox } from '@/components/cms/field-checkbox';
import {
  useTestimonialsAdmin,
  useCreateTestimonial,
  useUpdateTestimonial,
  useApproveTestimonial,
  useDeleteTestimonial,
  type Testimonial,
  type TestimonialInput,
} from '@/lib/hooks/testimonials';

// -----------------------------------------------------------------------------
// Formulario de alta/edición
// -----------------------------------------------------------------------------

const testimonialSchema = z.object({
  clientName: z.string().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  rating: z.coerce
    .number({ invalid_type_error: 'Puntuación de 1 a 5' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1')
    .max(5, 'Máximo 5'),
  text: z.string().min(4, 'Escribe la opinión').max(2000, 'Máximo 2000 caracteres'),
  approved: z.boolean().optional(),
});

type TestimonialFormValues = z.infer<typeof testimonialSchema>;

function TestimonialFormDialog({
  open,
  onOpenChange,
  testimonial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testimonial?: Testimonial | undefined;
  onSubmit: (input: TestimonialInput) => Promise<void>;
}): React.JSX.Element {
  const defaultValues: TestimonialFormValues = {
    clientName: testimonial?.clientName ?? '',
    rating: testimonial?.rating ?? 5,
    text: testimonial?.text ?? '',
    approved: testimonial?.approved ?? true,
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={testimonial ? 'Editar opinión' : 'Nueva opinión'}
      description="Publica las opiniones reales de tus clientas en la web."
      schema={testimonialSchema}
      defaultValues={defaultValues}
      submitLabel={testimonial ? 'Guardar cambios' : 'Crear opinión'}
      onSubmit={async (values) => {
        await onSubmit({
          clientName: values.clientName,
          rating: values.rating,
          text: values.text,
          approved: values.approved ?? true,
        });
      }}
    >
      <FieldText<TestimonialFormValues> name="clientName" label="Nombre de la clienta" required placeholder="María G." />
      <FieldNumber<TestimonialFormValues> name="rating" label="Puntuación (1-5)" required min={1} max={5} step={1} />
      <FieldTextarea<TestimonialFormValues>
        name="text"
        label="Opinión"
        required
        placeholder="Cuéntanos su experiencia…"
        rows={4}
      />
      <FieldCheckbox<TestimonialFormValues>
        name="approved"
        label="Aprobada (visible en la web)"
        description="Si se desmarca, la opinión queda oculta hasta que la apruebes."
      />
    </FormDialog>
  );
}

// -----------------------------------------------------------------------------
// Página
// -----------------------------------------------------------------------------

/** Estrellas de puntuación (solo lectura) para la tabla. */
function Stars({ rating }: { rating: number }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-0.5 text-brand-500" aria-label={`${rating} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < rating ? 'size-3.5 fill-brand-500 text-brand-500' : 'size-3.5 text-ink-soft/30'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/**
 * CMS · Opiniones de la web pública. Alta/edición, aprobar/ocultar (toggle) y
 * eliminar. Solo las aprobadas se muestran en la web.
 */
export default function OpinionesPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Testimonial | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Testimonial | undefined>(undefined);

  const query = useTestimonialsAdmin({ page, pageSize });
  const createTestimonial = useCreateTestimonial();
  const updateTestimonial = useUpdateTestimonial();
  const approveTestimonial = useApproveTestimonial();
  const deleteTestimonial = useDeleteTestimonial();

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (testimonial: Testimonial): void => {
    setEditing(testimonial);
    setFormOpen(true);
  };

  const toggleApproval = async (testimonial: Testimonial): Promise<void> => {
    try {
      await approveTestimonial.mutateAsync({ id: testimonial.id, approved: !testimonial.approved });
      toast({ title: testimonial.approved ? 'Opinión ocultada' : 'Opinión aprobada', variant: 'success' });
    } catch (error) {
      toast({ title: 'No se pudo actualizar', description: getErrorMessage(error), variant: 'danger' });
    }
  };

  const columns = React.useMemo<ColumnDef<Testimonial, unknown>[]>(
    () => [
      {
        accessorKey: 'clientName',
        header: 'Clienta',
        cell: ({ row }) => <span className="font-medium text-ink">{row.original.clientName}</span>,
      },
      {
        accessorKey: 'rating',
        header: 'Puntuación',
        cell: ({ row }) => <Stars rating={row.original.rating} />,
      },
      {
        accessorKey: 'text',
        header: 'Opinión',
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-md text-sm text-ink-soft">{row.original.text}</p>
        ),
      },
      {
        id: 'approved',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={row.original.approved ? 'success' : 'warning'}>
            {row.original.approved ? 'Aprobada' : 'Pendiente'}
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
              aria-label={row.original.approved ? 'Ocultar opinión' : 'Aprobar opinión'}
              onClick={() => void toggleApproval(row.original)}
            >
              {row.original.approved ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar opinión de ${row.original.clientName}`}
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar opinión de ${row.original.clientName}`}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-4 text-danger" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opiniones"
        description="Publica y modera las opiniones de tus clientas."
        icon={<MessageSquareQuote className="size-6" aria-hidden="true" />}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Añadir opinión
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        emptyIcon={MessageSquareQuote}
        emptyTitle="Sin opiniones"
        emptyDescription="Añade la primera opinión de una clienta para mostrarla en la web."
        emptyAction={<Button onClick={openCreate}>Añadir opinión</Button>}
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

      <TestimonialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        testimonial={editing}
        onSubmit={async (input) => {
          if (editing) {
            await updateTestimonial.mutateAsync({ id: editing.id, data: input });
            toast({ title: 'Opinión actualizada', variant: 'success' });
          } else {
            await createTestimonial.mutateAsync(input);
            toast({ title: 'Opinión creada', variant: 'success' });
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(undefined)}
        title="Eliminar opinión"
        description={
          deleteTarget
            ? `¿Seguro que quieres eliminar la opinión de «${deleteTarget.clientName}»? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteTestimonial.mutateAsync(deleteTarget.id);
            toast({ title: 'Opinión eliminada', variant: 'success' });
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
