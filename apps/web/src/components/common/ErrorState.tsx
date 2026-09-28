'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ApiClientError } from '@/lib/api';

export interface ErrorStateProps {
  /** Error capturado; se extrae un mensaje legible cuando es posible. */
  error?: unknown;
  title?: string | undefined;
  /** Mensaje explícito; si se omite se deriva del `error`. */
  description?: string | undefined;
  /** Handler de reintento (p.ej. `refetch` de TanStack Query). */
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}

/** Extrae un mensaje legible en español de cualquier error. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ha ocurrido un error inesperado.';
}

/**
 * Estado de error de marca con reintento. Úsalo en cualquier vista cuya
 * consulta falle (SPEC: carga / vacío / error en cada superficie).
 */
export function ErrorState({
  error,
  title = 'No se pudieron cargar los datos',
  description,
  onRetry,
  className,
}: ErrorStateProps): React.JSX.Element {
  const message = description ?? (error ? getErrorMessage(error) : undefined);
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-danger/20 bg-danger/5 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
        {message ? (
          <p className="mx-auto max-w-sm text-sm text-ink-soft/80">{message}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
