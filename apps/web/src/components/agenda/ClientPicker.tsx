'use client';

/**
 * Selector de clienta con búsqueda incremental, conectado a react-hook-form vía
 * `useFormContext` (campo `clientId`). Pensado para usarse dentro de un
 * `FormDialog`/`FormProvider`. Muestra resultados de la API y estados de
 * carga/vacío. Accesible: listbox con teclado y foco visible.
 */
import * as React from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { Check, Loader2, Search, UserRound } from 'lucide-react';
import { Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAgendaClients, type AgendaClientOption } from '@/lib/hooks/bookings';

export interface ClientPickerProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  required?: boolean;
}

export function ClientPicker<T extends FieldValues>({
  name,
  label = 'Clienta',
  required,
}: ClientPickerProps<T>): React.JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<AgendaClientOption | null>(null);
  const { data: clients, isLoading, isError } = useAgendaClients(search);

  const id = `client-picker-${String(name)}`;
  const errorMsg = (errors as Record<string, { message?: string }>)[name as string]?.message;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-1.5">
          <Label htmlFor={id}>
            {label}
            {required ? <span className="ml-0.5 text-danger">*</span> : null}
          </Label>

          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-ink">
                <UserRound className="size-4 text-brand-500" aria-hidden="true" />
                <span className="font-medium">{selected.name}</span>
                <span className="text-ink-soft/60">{selected.phone}</span>
              </span>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                onClick={() => {
                  setSelected(null);
                  field.onChange('');
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft/50"
                  aria-hidden="true"
                />
                <Input
                  id={id}
                  className="pl-9"
                  placeholder="Buscar por nombre o teléfono…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-invalid={errorMsg ? true : undefined}
                  autoComplete="off"
                />
              </div>

              <div
                role="listbox"
                aria-label="Resultados de clientas"
                className="max-h-48 overflow-y-auto rounded-xl border border-brand-100"
              >
                {isLoading ? (
                  <p className="flex items-center gap-2 px-3 py-3 text-sm text-ink-soft/70">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Buscando…
                  </p>
                ) : isError ? (
                  <p className="px-3 py-3 text-sm text-danger">No se pudieron cargar las clientas.</p>
                ) : !clients || clients.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-ink-soft/70">
                    {search ? 'Sin resultados.' : 'Escribe para buscar una clienta.'}
                  </p>
                ) : (
                  clients.map((client) => {
                    const isActive = field.value === client.id;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
                          'hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none',
                          isActive && 'bg-brand-50',
                        )}
                        onClick={() => {
                          setSelected(client);
                          field.onChange(client.id);
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{client.name}</span>
                          <span className="block truncate text-xs text-ink-soft/60">
                            {client.phone}
                          </span>
                        </span>
                        {isActive ? (
                          <Check className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {errorMsg ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {errorMsg}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}
