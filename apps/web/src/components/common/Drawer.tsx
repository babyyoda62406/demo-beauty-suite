'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  type SheetContentProps,
} from '@/components/ui';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  /** Lado desde el que aparece (por defecto derecha). */
  side?: SheetContentProps['side'];
  /** Contenido con scroll del panel. */
  children: React.ReactNode;
  /** Pie fijo (acciones). */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Panel lateral (drawer) de marca sobre el primitivo Sheet. Cabecera con
 * título/descripción, cuerpo con scroll y pie opcional para acciones.
 * Ideal para fichas de detalle y filtros.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  children,
  footer,
  className,
}: DrawerProps): React.JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn('flex w-full flex-col gap-0 p-0 sm:max-w-md', className)}>
        {title || description ? (
          <SheetHeader className="border-b border-brand-100/70 p-6">
            {title ? <SheetTitle>{title}</SheetTitle> : null}
            {description ? <p className="text-sm text-ink-soft/70">{description}</p> : null}
          </SheetHeader>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-brand-100/70 p-4">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
