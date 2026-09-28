'use client';

import * as React from 'react';
import {
  Ban,
  Gift,
  History,
  Link2,
  Loader2,
  MinusCircle,
  Plus,
  Search,
  Share2,
} from 'lucide-react';
import { z } from 'zod';
import { Button, toast } from '@/components/ui';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldNumber,
  FieldText,
  FormDialog,
  MoneyText,
  PageHeader,
  Pagination,
  Toolbar,
  getErrorMessage,
} from '@/components/common';
import {
  useAnularTarjeta,
  useCrearTarjeta,
  useDescontarTarjeta,
  useTarjetasRegalo,
  type EstadoTarjeta,
  type TarjetaRegaloApi,
} from '@/lib/hooks/gift-cards';
import { cn } from '@/lib/utils';
import { BotonEscanear, EscanearQr, codigoDesdeQr } from './escanear';
import { DialogoEmitir } from './emitir';
import { Movimientos } from './detalle';

const ESTADOS: Record<EstadoTarjeta, { texto: string; clase: string }> = {
  ACTIVE: { texto: 'Activa', clase: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  REDEEMED: { texto: 'Gastada', clase: 'border-neutral-300 bg-neutral-100 text-neutral-600' },
  EXPIRED: { texto: 'Caducada', clase: 'border-amber-300 bg-amber-50 text-amber-700' },
  CANCELLED: { texto: 'Anulada', clase: 'border-rose-300 bg-rose-50 text-rose-700' },
};

/** Enlace público de una tarjeta: lleva el secreto, no el código del mostrador. */
function enlaceDe(token: string): string {
  if (typeof window === 'undefined') return `/regalo/${token}`;
  return `${window.location.origin}/regalo/${token}`;
}

const descontarSchema = z.object({
  importeEuros: z.coerce.number().positive('Pon un importe mayor que cero'),
  reason: z.string().trim().max(160).optional(),
});
type DescontarValores = z.infer<typeof descontarSchema>;

/**
 * Tarjetas regalo del salón.
 *
 * La clienta paga por WhatsApp, en efectivo o por Bizum, y aquí la dueña emite
 * la tarjeta y le manda el enlace. Cada vez que la usan, se busca —escaneando
 * su QR o tecleando el código— y se descuenta lo que gasten; el saldo baja
 * hasta agotarse y cada movimiento queda registrado.
 */
export default function TarjetasRegaloPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [estado, setEstado] = React.useState<EstadoTarjeta | 'todas'>('todas');
  const [busqueda, setBusqueda] = React.useState('');
  const [escaneando, setEscaneando] = React.useState(false);
  const [emitiendo, setEmitiendo] = React.useState(false);
  const [aDescontar, setADescontar] = React.useState<TarjetaRegaloApi | undefined>();
  const [aAnular, setAAnular] = React.useState<TarjetaRegaloApi | undefined>();
  const [reciente, setReciente] = React.useState<TarjetaRegaloApi | undefined>();
  const [abierta, setAbierta] = React.useState<string | undefined>();

  const query = useTarjetasRegalo({
    page,
    pageSize: 12,
    ...(estado === 'todas' ? {} : { status: estado }),
  });
  const crear = useCrearTarjeta();
  const descontar = useDescontarTarjeta();
  const anular = useAnularTarjeta();

  const conError = (accion: string) => (error: unknown) =>
    toast({ title: accion, description: getErrorMessage(error), variant: 'danger' });

  const todas = query.data?.data ?? [];
  const meta = query.data?.meta;
  // El filtro por código se hace aquí: el listado del API no busca por texto.
  const filtro = busqueda.trim().toUpperCase();
  const tarjetas = filtro
    ? todas.filter(
        (t) =>
          t.code.includes(filtro) ||
          (t.recipientName ?? '').toUpperCase().includes(filtro) ||
          (t.purchasedBy?.name ?? '').toUpperCase().includes(filtro),
      )
    : todas;

  const copiarEnlace = async (t: TarjetaRegaloApi): Promise<void> => {
    try {
      await navigator.clipboard.writeText(enlaceDe(t.publicToken));
      toast({ title: 'Enlace copiado', description: 'Ya puedes pegarlo donde quieras.' });
    } catch {
      toast({ title: 'No se ha podido copiar', variant: 'danger' });
    }
  };

  const compartirWhatsApp = (t: TarjetaRegaloApi): void => {
    const para = t.recipientName ? `${t.recipientName}, ¡tienes` : '¡Tienes';
    const texto = `${para} una tarjeta regalo de Estudio Aurora! Aquí la tienes: ${enlaceDe(t.publicToken)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tarjetas regalo"
        description="Emite una tarjeta cuando te la paguen y descuéntale el saldo cada vez que la usen."
        icon={<Gift className="size-6" aria-hidden="true" />}
        actions={
          <Button onClick={() => setEmitiendo(true)}>
            <Plus aria-hidden="true" />
            Emitir tarjeta
          </Button>
        }
      />

      <Toolbar
        start={
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft/60"
                aria-hidden="true"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Código, para quién, quién compró…"
                aria-label="Buscar tarjeta"
                className="h-10 w-64 rounded-xl border border-brand-100 bg-white pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-400"
              />
            </label>
            <BotonEscanear onAbrir={() => setEscaneando(true)} />
          </div>
        }
        end={
          <div className="flex flex-wrap gap-1.5">
            {(['todas', 'ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED'] as const).map((e) => (
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
                {e === 'todas' ? 'Todas' : ESTADOS[e].texto}
              </button>
            ))}
          </div>
        }
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <p className="text-sm text-ink-soft">Cargando tarjetas…</p>
      ) : tarjetas.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={filtro ? 'Ninguna tarjeta con esa búsqueda' : 'Todavía no has emitido ninguna'}
          description={
            filtro
              ? 'Revisa el código o prueba a escanear el QR de la tarjeta.'
              : 'Cuando una clienta te pague una tarjeta regalo, emítela aquí y mándale el enlace.'
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tarjetas.map((t) => {
            const gastado = t.initialAmount - t.balance;
            const porcentaje = t.initialAmount > 0 ? (t.balance / t.initialAmount) * 100 : 0;
            const desplegada = abierta === t.id;
            return (
              <li
                key={t.id}
                className="flex flex-col gap-4 rounded-2xl border border-brand-100/70 bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* Lo primero, para quién es: es lo que se busca de un vistazo */}
                    <p className="truncate font-medium text-ink">
                      {t.recipientName ? `Para ${t.recipientName}` : 'Sin destinataria'}
                    </p>
                    <p className="truncate text-xs text-ink-soft/70">
                      {t.senderName ? `De ${t.senderName} · ` : ''}
                      <span className="font-mono">{t.code}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
                      ESTADOS[t.status].clase,
                    )}
                  >
                    {ESTADOS[t.status].texto}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-xs uppercase tracking-wider text-ink-soft/70">
                      {t.service ? t.service.name : 'Saldo'}
                    </span>
                    <MoneyText
                      cents={t.balance}
                      currency={t.currency}
                      className="shrink-0 font-serif text-2xl font-semibold text-brand-600"
                    />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100/70">
                    <div
                      className="h-full rounded-full bg-brand-gradient transition-[width]"
                      style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-soft/70">
                    De <MoneyText cents={t.initialAmount} currency={t.currency} />
                    {gastado > 0 ? (
                      <>
                        {' · gastado '}
                        <MoneyText cents={gastado} currency={t.currency} />
                      </>
                    ) : null}
                  </p>
                </div>

                <p className="text-xs text-ink-soft/70">
                  {t.purchasedBy ? (
                    <>
                      La compró <strong className="text-ink">{t.purchasedBy.name}</strong>
                      {t.purchasedBy.phone ? ` · ${t.purchasedBy.phone}` : ''}
                    </>
                  ) : (
                    'Comprada sin ficha de clienta'
                  )}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={t.status !== 'ACTIVE' || descontar.isPending}
                    onClick={() => setADescontar(t)}
                  >
                    <MinusCircle aria-hidden="true" />
                    Descontar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => compartirWhatsApp(t)}>
                    <Share2 aria-hidden="true" />
                    Enviar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void copiarEnlace(t)}>
                    <Link2 aria-hidden="true" />
                    Enlace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-expanded={desplegada}
                    onClick={() => setAbierta(desplegada ? undefined : t.id)}
                  >
                    <History aria-hidden="true" />
                    Movimientos
                  </Button>
                  {t.status === 'ACTIVE' ? (
                    <Button size="sm" variant="ghost" onClick={() => setAAnular(t)}>
                      <Ban aria-hidden="true" />
                      Anular
                    </Button>
                  ) : null}
                </div>

                {desplegada ? (
                  <div className="border-t border-brand-100/70 pt-1">
                    <Movimientos tarjeta={t} />
                  </div>
                ) : null}
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

      {escaneando ? (
        <EscanearQr
          onCerrar={() => setEscaneando(false)}
          onLeido={(codigo) => {
            setEscaneando(false);
            setBusqueda(codigoDesdeQr(codigo));
            setEstado('todas');
            setPage(1);
          }}
        />
      ) : null}

      <DialogoEmitir
        open={emitiendo}
        onOpenChange={setEmitiendo}
        onEmitir={async (datos) => {
          const creada = await crear.mutateAsync(datos);
          setReciente(creada);
          toast({ title: 'Tarjeta emitida', description: creada.code, variant: 'success' });
        }}
      />

      <FormDialog<typeof descontarSchema>
        open={Boolean(aDescontar)}
        onOpenChange={(open) => !open && setADescontar(undefined)}
        title="Descontar del saldo"
        description={
          aDescontar
            ? `${aDescontar.recipientName ? `Tarjeta de ${aDescontar.recipientName}. ` : ''}Saldo disponible: ${(aDescontar.balance / 100).toFixed(2)} €.`
            : ''
        }
        schema={descontarSchema}
        defaultValues={{ importeEuros: 0, reason: '' }}
        submitLabel="Descontar"
        onSubmit={async (values) => {
          if (!aDescontar) return;
          await descontar.mutateAsync({
            id: aDescontar.id,
            amount: Math.round(values.importeEuros * 100),
            ...(values.reason ? { reason: values.reason } : {}),
          });
          toast({ title: 'Saldo descontado', variant: 'success' });
          setADescontar(undefined);
        }}
      >
        <FieldNumber<DescontarValores>
          name="importeEuros"
          label="Importe a descontar (€)"
          required
          min={0.5}
          step={0.5}
        />
        <FieldText<DescontarValores>
          name="reason"
          label="En qué se lo gasta"
          placeholder="Manicura semipermanente"
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(aAnular)}
        onOpenChange={(open) => !open && setAAnular(undefined)}
        title="Anular la tarjeta"
        description={`La tarjeta ${aAnular?.code ?? ''} dejará de poder usarse. Esto no se puede deshacer.`}
        confirmLabel="Anular"
        onConfirm={async () => {
          if (!aAnular) return;
          try {
            await anular.mutateAsync({ id: aAnular.id });
            toast({ title: 'Tarjeta anulada' });
          } catch (error) {
            conError('No se ha podido anular')(error);
            throw error;
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(reciente)}
        onOpenChange={(open) => !open && setReciente(undefined)}
        title="Tarjeta lista"
        description={
          reciente
            ? `Código ${reciente.code}. Mándale el enlace a ${reciente.recipientName || 'la clienta'} para que la tenga en el móvil.`
            : ''
        }
        confirmLabel="Enviar por WhatsApp"
        onConfirm={async () => {
          if (reciente) compartirWhatsApp(reciente);
        }}
      />

      {crear.isPending || descontar.isPending || anular.isPending ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Guardando…
        </p>
      ) : null}
    </div>
  );
}
