'use client';

import * as React from 'react';
import { Loader2, Lock, Save } from 'lucide-react';
import { Button, Card, Textarea, useToast } from '@/components/ui';
import { getErrorMessage } from '@/components/common';
import { useUpdateNotes } from '@/lib/hooks/clients';

const MAX_LENGTH = 5000;

/**
 * Pestaña "Notas privadas": editor de las notas internas del salón sobre la
 * clienta (PATCH /clients/:id/notes). Solo visible para el equipo.
 */
export function ClientNotes({
  clientId,
  notes,
}: {
  clientId: string;
  notes: string | null;
}): React.JSX.Element {
  const { toast } = useToast();
  const initial = notes ?? '';
  const [value, setValue] = React.useState(initial);
  const updateNotes = useUpdateNotes();

  // Sincroniza si la ficha se recarga con notas distintas.
  React.useEffect(() => {
    setValue(notes ?? '');
  }, [notes]);

  const dirty = value !== initial;

  const handleSave = async (): Promise<void> => {
    try {
      await updateNotes.mutateAsync({ id: clientId, notes: value.trim() ? value : null });
      toast({ variant: 'success', title: 'Notas guardadas' });
    } catch (error) {
      toast({ variant: 'danger', title: 'No se pudieron guardar', description: getErrorMessage(error) });
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
          <Lock className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-serif text-lg font-semibold text-ink">Notas privadas</h3>
          <p className="text-xs text-ink-soft/70">Solo visibles para el equipo del salón.</p>
        </div>
      </div>

      <label htmlFor="client-notes" className="sr-only">
        Notas privadas de la clienta
      </label>
      <Textarea
        id="client-notes"
        rows={8}
        maxLength={MAX_LENGTH}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Preferencias de trato, avisos, información relevante para el equipo…"
      />

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-ink-soft/50 tabular-nums">
          {value.length} / {MAX_LENGTH}
        </p>
        <div className="flex items-center gap-2">
          {dirty ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setValue(initial)}
              disabled={updateNotes.isPending}
            >
              Descartar
            </Button>
          ) : null}
          <Button size="sm" onClick={handleSave} disabled={!dirty || updateNotes.isPending}>
            {updateNotes.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Guardar notas
          </Button>
        </div>
      </div>
    </Card>
  );
}
