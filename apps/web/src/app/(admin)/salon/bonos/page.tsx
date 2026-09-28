'use client';

import * as React from 'react';
import { Ban, CheckCircle2, Loader2, Plus, Ticket } from 'lucide-react';
import { z } from 'zod';
import { Button, toast } from '@/components/ui';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldNumber,
  FieldSelect,
  FieldText,
  FormDialog,
  MoneyText,
  PageHeader,
  Pagination,
  Toolbar,
  getErrorMessage,
} from '@/components/common';
import {
  useAnularBono,
  useBonos,
  useConsumirBono,
  useCrearBono,
  type BonoApi,
  type EstadoBono,
} from '@/lib/hooks/vouchers';
import { useClients } from '@/lib/hooks/clients';
import { cn } from '@/lib/utils';

const ESTADOS: Record<EstadoBono, { texto: string; clase: string }> = {
  ACTIVE: { texto: 'Activo', clase: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  USED: { texto: 'Agotado', clase: 'border-neutral-300 bg-neutral-100 text-neutral-600' },
  EXPIRED: { texto: 'Caducado', clase: 'border-amber-300 bg-amber-50 text-amber-700' },
  CANCELLED: { texto: 'Anulado', clase: 'border-rose-300 bg-rose-50 text-rose-700' },
};

const altaSchema = z.object({
  clientId: z.string().min(1, 'Elige la clienta'),
  totalSessions: z.coerce.number().int().min(1, 'Al menos una sesión').max(1000),
  precioEuros: z.coerce.number().min(0, 'No puede ser negativo'),
  expiresAt: z.string().trim().optional(),
});
type AltaValores = z.infer<typeof altaSchema>;

/** Los huecos del bono, para verlo de un vistazo como la cartulina de papel. */
function Sesiones({ usadas, total }: { usadas: number; total: number }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`${usadas} de ${total} sesiones usadas`}>
      {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'flex size-6 items-center justify-center rounded-full border text-[0.6rem] font-semibold',
            i < usadas
              ? 'border-brand-500 bg-brand-gradient text-white shadow-soft'
              : 'border-dashed border-brand-200 text-brand-200',
          )}
        >
          {i < usadas ? '✓' : i + 1}
        </span>
      ))}
    </div>
  );
}

/**
 * Bonos de sesiones del salón.
 *
 * La clienta paga el bono por WhatsApp, en efectivo o por Bizum, y aquí la
 * dueña se lo da de alta con las sesiones que ha comprado. Cada vez que viene,
 * se gasta una sesión desde esta misma pantalla.
 */
export default function BonosPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [estado, setEstado] = React.useState<EstadoBono | 'todos'>('todos');
  const [dandoAlta, setDandoAlta] = React.useState(false);
  const [aAnular, setAAnular] = React.useState<BonoApi | undefined>();

  const query = useBonos({
    page,
    pageSize: 12,
    ...(estado === 'todos' ? {} : { status: estado }),
  });
  const clientas = useClients({ pageSize: 100 });
  const crear = useCrearBono();
  const consumir = useConsumirBono();
  const anular = useAnularBono();

  const conError = (accion: string) => (error: unknown) =>
    toast({ title: accion, description: getErrorMessage(error), variant: 'danger' });

  const bonos = query.data?.data ?? [];
  const meta = query.data?.meta;
  const opcionesClientas = (clientas.data?.data ?? []).map((c) => ({
    value: c.id,
    label: c.phone ? `${c.name} · ${c.phone}` : c.name,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bonos"
        description="Da de alta el bono cuando te lo paguen y gasta una sesión cada vez que venga."
        icon={<Ticket className="size-6" aria-hidden="true" />}
        actions={
          <Button onClick={() => setDandoAlta(true)}>
            <Plus aria-hidden="true" />
            Nuevo bono
          </Button>
        }
      />

      <Toolbar
        end={
          <div className="flex flex-wrap gap-1.5">
            {(['todos', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setEstado(e);
                  setPage(1);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  estado === e
                    ? 'border-brand-500 bg-brand-gradient text-white'
                    : 'border-brand-100 bg-white text-ink-soft hover:border-brand-300',
                )}
              >
                {e === 'todos' ? 'Todos' : ESTADOS[e].texto}
              </button>
            ))}
          </div>
        }
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <p className="text-sm text-ink-soft">Cargando bonos…</p>
      ) : bonos.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Todavía no hay bonos"
          description="Cuando una clienta te pague un bono de sesiones, dáselo de alta aquí."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bonos.map((b) => {
            const restantes = b.remainingSessions ?? Math.max(b.totalSessions - b.usedSessions, 0);
            return (
              <li
                key={b.id}
                className="flex flex-col gap-4 rounded-2xl border border-brand-100/70 bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{b.client?.name ?? 'Clienta'}</p>
                    {b.client?.phone ? (
                      <p className="truncate text-xs text-ink-soft/70">{b.client.phone}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
                      ESTADOS[b.status].clase,
                    )}
                  >
                    {ESTADOS[b.status].texto}
                  </span>
                </div>

                <Sesiones usadas={b.usedSessions} total={b.totalSessions} />

                <p className="text-xs text-ink-soft/70">
                  Quedan <strong className="text-ink">{restantes}</strong> de {b.totalSessions} sesiones
                  {b.price > 0 ? (
                    <>
                      {' · pagó '}
                      <MoneyText cents={b.price} currency={b.currency} />
                    </>
                  ) : null}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={b.status !== 'ACTIVE' || restantes === 0 || consumir.isPending}
                    onClick={() =>
                      consumir.mutate(
                        { id: b.id },
                        {
                          onSuccess: () => toast({ title: 'Sesión gastada', variant: 'success' }),
                          onError: conError('No se ha podido gastar la sesión'),
                        },
                      )
                    }
                  >
                    <CheckCircle2 aria-hidden="true" />
                    Gastar sesión
                  </Button>
                  {b.status === 'ACTIVE' ? (
                    <Button size="sm" variant="ghost" onClick={() => setAAnular(b)}>
                      <Ban aria-hidden="true" />
                      Anular
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {meta && !query.isLoading ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          onPageChange={setPage}
        />
      ) : null}

      <FormDialog<typeof altaSchema>
        open={dandoAlta}
        onOpenChange={setDandoAlta}
        title="Nuevo bono"
        description="Dalo de alta cuando ya te lo hayan pagado. El precio se pone en euros."
        schema={altaSchema}
        defaultValues={{ clientId: '', totalSessions: 5, precioEuros: 0, expiresAt: '' }}
        submitLabel="Dar de alta"
        onSubmit={async (values) => {
          await crear.mutateAsync({
            clientId: values.clientId,
            totalSessions: values.totalSessions,
            price: Math.round(values.precioEuros * 100),
            ...(values.expiresAt ? { expiresAt: new Date(values.expiresAt).toISOString() } : {}),
          });
          toast({ title: 'Bono dado de alta', variant: 'success' });
        }}
      >
        <FieldSelect<AltaValores>
          name="clientId"
          label="Clienta"
          required
          options={opcionesClientas}
          placeholder={clientas.isLoading ? 'Cargando clientas…' : 'Elige una clienta'}
        />
        <FieldNumber<AltaValores> name="totalSessions" label="Sesiones" required min={1} step={1} />
        <FieldNumber<AltaValores> name="precioEuros" label="Precio pagado (€)" min={0} step={5} />
        <FieldText<AltaValores> name="expiresAt" label="Caduca el" type="date" />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(aAnular)}
        onOpenChange={(open) => !open && setAAnular(undefined)}
        title="Anular el bono"
        description={`El bono de ${aAnular?.client?.name ?? 'la clienta'} dejará de poder usarse.`}
        confirmLabel="Anular"
        onConfirm={async () => {
          if (!aAnular) return;
          try {
            await anular.mutateAsync({ id: aAnular.id });
            toast({ title: 'Bono anulado' });
          } catch (error) {
            conError('No se ha podido anular')(error);
            throw error;
          }
        }}
      />

      {crear.isPending || anular.isPending ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Guardando…
        </p>
      ) : null}
    </div>
  );
}
