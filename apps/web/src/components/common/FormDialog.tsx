'use client';

import * as React from 'react';
import { useForm, FormProvider, type DefaultValues, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { getErrorMessage } from './ErrorState';

export interface FormDialogProps<TSchema extends z.ZodTypeAny> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Esquema zod que valida y tipa el formulario. */
  schema: TSchema;
  defaultValues: DefaultValues<z.input<TSchema>>;
  /** Envío validado. Lanzar/rechazar muestra el error; resolver cierra el modal. */
  onSubmit: (values: z.output<TSchema>) => void | Promise<void>;
  /** Campos del formulario (usa Field* que leen el FormProvider). */
  children: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  /** Cierra el diálogo automáticamente al enviar con éxito (por defecto true). */
  closeOnSuccess?: boolean;
  /**
   * Panel a la izquierda de los campos, para formularios que se entienden mejor
   * viendo lo que se está creando (una tarjeta regalo, por ejemplo). Va dentro
   * del `FormProvider`, así que puede leer el formulario con `useWatch`.
   */
  aside?: React.ReactNode;
  /** Ancho del diálogo, para cuando el de serie se queda corto. */
  contentClassName?: string;
}

/**
 * Modal de formulario de marca: react-hook-form + zod resolver, `FormProvider`
 * para los campos, estado de envío y manejo de error. Devuelve el foco y
 * bloquea el botón mientras envía.
 */
export function FormDialog<TSchema extends z.ZodTypeAny>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  children,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  closeOnSuccess = true,
  aside,
  contentClassName,
}: FormDialogProps<TSchema>): React.JSX.Element {
  const form = useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Reinicia el formulario cada vez que se (re)abre el diálogo.
  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit: SubmitHandler<z.output<TSchema>> = async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
      if (closeOnSuccess) onOpenChange(false);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      {/* Layout en columna con altura máxima: cabecera y pie fijos, cuerpo con
          scroll interno → el modal SIEMPRE cabe en pantalla y los botones se
          ven sin desbordar (móvil y escritorio). Más ancho para formularios. */}
      <DialogContent
        className={cn(
          'flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl',
          contentClassName,
        )}
      >
        <DialogHeader className="shrink-0 border-b border-brand-100/70 px-6 pb-4 pt-6 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto px-6 py-5',
                aside ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8' : 'space-y-4',
              )}
            >
              {aside ? <div className="min-w-0">{aside}</div> : null}

              <div className={cn('min-w-0 space-y-4', aside && 'lg:pt-1')}>
                {children}

                {submitError ? (
                  <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                    {submitError}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-brand-100/70 bg-white px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
