'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Gift, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { FieldSelect, FieldText, FormDialog } from '@/components/common';
import {
  DISENO_POR_DEFECTO,
  NOMBRES_DISENO,
  ORDEN_DISENOS,
  SimbolosTarjeta,
  TarjetaRegalo,
  type DisenoId,
} from '@/components/gift-card/GiftCard';
import { useServicesAdmin } from '@/lib/hooks/catalog';
import { useClients } from '@/lib/hooks/clients';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CrearTarjeta } from '@/lib/hooks/gift-cards';

/**
 * Formulario para emitir una tarjeta regalo.
 *
 * La tarjeta se ve al lado y se va rellenando según escribes: quien la vende
 * está eligiendo un regalo, no dando de alta un registro, y conviene que vea lo
 * que va a recibir la clienta antes de darle a emitir.
 */

export const emitirSchema = z
  .object({
    diseno: z.string().min(1),
    tipo: z.enum(['importe', 'servicio']),
    importeEuros: z.coerce.number().min(0).optional(),
    serviceId: z.string().optional(),
    recipientName: z.string().trim().max(80).optional(),
    senderName: z.string().trim().max(80).optional(),
    purchasedByClientId: z.string().optional(),
    expiresAt: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.tipo === 'importe' && !(v.importeEuros && v.importeEuros > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['importeEuros'],
        message: 'Pon un importe mayor que cero',
      });
    }
    if (v.tipo === 'servicio' && !v.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serviceId'],
        message: 'Elige el servicio que se regala',
      });
    }
  });

export type EmitirValores = z.infer<typeof emitirSchema>;

/** Selector de qué se regala: un importe suelto o un servicio del catálogo. */
function QueSeRegala(): React.JSX.Element {
  const { setValue } = useFormContext<EmitirValores>();
  const tipo = useWatch<EmitirValores, 'tipo'>({ name: 'tipo' });
  const opciones = [
    { valor: 'importe' as const, icono: Sparkles, titulo: 'Un importe', pie: 'Se gasta en lo que quiera' },
    { valor: 'servicio' as const, icono: Gift, titulo: 'Un servicio', pie: 'Del catálogo del salón' },
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">¿Qué se regala?</legend>
      <div className="grid grid-cols-2 gap-2">
        {opciones.map(({ valor, icono: Icono, titulo, pie }) => {
          const activo = tipo === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              onClick={() => setValue('tipo', valor, { shouldValidate: true })}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition',
                activo
                  ? 'border-brand-500 bg-brand-50 shadow-soft'
                  : 'border-brand-100 bg-white hover:border-brand-300',
              )}
            >
              <Icono
                className={cn('size-5', activo ? 'text-brand-600' : 'text-ink-soft/60')}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-ink">{titulo}</span>
              <span className="text-xs text-ink-soft/70">{pie}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Los siete diseños, para elegir con cuál se emite. */
function ElegirDiseno(): React.JSX.Element {
  const { setValue } = useFormContext<EmitirValores>();
  const actual = useWatch<EmitirValores, 'diseno'>({ name: 'diseno' });
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">Diseño</legend>
      <div className="flex flex-wrap gap-1.5">
        {ORDEN_DISENOS.map((d) => {
          const activo = actual === d;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={activo}
              onClick={() => setValue('diseno', d, { shouldValidate: true })}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                activo
                  ? 'border-brand-500 bg-brand-gradient text-white'
                  : 'border-brand-100 bg-white text-ink-soft hover:border-brand-300',
              )}
            >
              {NOMBRES_DISENO[d]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** La tarjeta, actualizándose con lo que se va escribiendo. */
function VistaPrevia({
  servicios,
}: {
  servicios: Array<{ id: string; name: string; price: number }>;
}): React.JSX.Element {
  const valores = useWatch<EmitirValores>();
  const servicio = servicios.find((s) => s.id === valores.serviceId);
  const centimos =
    valores.tipo === 'servicio'
      ? (servicio?.price ?? 0)
      : Math.round((Number(valores.importeEuros) || 0) * 100);

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-ink">Así la recibirá</p>

      <TarjetaRegalo
        diseno={(valores.diseno as DisenoId) || DISENO_POR_DEFECTO}
        datos={{
          para: valores.recipientName?.trim() || '',
          de: valores.senderName?.trim() || '',
          // El enlace definitivo lo genera el servidor al emitir; el QR de la
          // vista previa solo enseña a dónde apuntará.
          enlace: 'https://estudioaurora.demo/regalo/vista-previa',
        }}
      />

      <p className="mt-3 text-center text-xs text-ink-soft/70">Toca la tarjeta para ver el dorso.</p>

      {centimos > 0 ? (
        <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-ink-soft">
          {valores.tipo === 'servicio' && servicio ? (
            <>
              Se emite por <strong className="text-ink">{servicio.name}</strong>, con un saldo de{' '}
              {formatMoney(servicio.price, 'EUR')}. Si el servicio sube de precio, la tarjeta
              conserva el saldo con el que se vendió.
            </>
          ) : (
            <>
              Saldo de la tarjeta:{' '}
              <strong className="text-ink">{formatMoney(centimos, 'EUR')}</strong>.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

export function DialogoEmitir({
  open,
  onOpenChange,
  onEmitir,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEmitir: (datos: CrearTarjeta) => Promise<void>;
}): React.JSX.Element {
  const servicios = useServicesAdmin({ pageSize: 100 });
  const clientas = useClients({ pageSize: 100 });

  const listaServicios = (servicios.data?.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
  }));

  return (
    <>
      <SimbolosTarjeta />
      <FormDialog<typeof emitirSchema>
        open={open}
        onOpenChange={onOpenChange}
        title="Emitir tarjeta regalo"
        description="Emítela cuando ya te la hayan pagado. El código y el enlace se generan solos."
        schema={emitirSchema}
        defaultValues={{
          diseno: DISENO_POR_DEFECTO,
          tipo: 'importe',
          importeEuros: 50,
          serviceId: '',
          recipientName: '',
          senderName: '',
          purchasedByClientId: '',
          expiresAt: '',
        }}
        submitLabel="Emitir tarjeta"
        contentClassName="md:max-w-2xl lg:max-w-5xl"
        aside={<VistaPrevia servicios={listaServicios} />}
        onSubmit={async (values) => {
          const servicio = listaServicios.find((s) => s.id === values.serviceId);
          const centimos =
            values.tipo === 'servicio'
              ? (servicio?.price ?? 0)
              : Math.round((values.importeEuros ?? 0) * 100);
          await onEmitir({
            initialAmount: centimos,
            design: values.diseno,
            ...(values.tipo === 'servicio' && values.serviceId
              ? { serviceId: values.serviceId }
              : {}),
            ...(values.recipientName ? { recipientName: values.recipientName } : {}),
            ...(values.senderName ? { senderName: values.senderName } : {}),
            ...(values.purchasedByClientId
              ? { purchasedByClientId: values.purchasedByClientId }
              : {}),
            ...(values.expiresAt ? { expiresAt: new Date(values.expiresAt).toISOString() } : {}),
          });
        }}
      >
        <ElegirDiseno />
        <QueSeRegala />
        <CamposSegunTipo servicios={listaServicios} cargandoServicios={servicios.isLoading} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldText<EmitirValores> name="recipientName" label="Para" placeholder="Laura" />
          <FieldText<EmitirValores> name="senderName" label="De parte de" placeholder="Marta" />
        </div>

        <FieldSelect<EmitirValores>
          name="purchasedByClientId"
          label="Quién la compra"
          options={(clientas.data?.data ?? []).map((c) => ({
            value: c.id,
            label: c.phone ? `${c.name} · ${c.phone}` : c.name,
          }))}
          placeholder={clientas.isLoading ? 'Cargando clientas…' : 'Si es clienta tuya, elígela'}
        />

        <FieldText<EmitirValores> name="expiresAt" label="Caduca el" type="date" />
      </FormDialog>
    </>
  );
}

/** Importe o servicio, según lo que se haya elegido arriba. */
function CamposSegunTipo({
  servicios,
  cargandoServicios,
}: {
  servicios: Array<{ id: string; name: string; price: number }>;
  cargandoServicios: boolean;
}): React.JSX.Element {
  const tipo = useWatch<EmitirValores, 'tipo'>({ name: 'tipo' });
  if (tipo === 'servicio') {
    return (
      <FieldSelect<EmitirValores>
        name="serviceId"
        label="Servicio regalado"
        required
        options={servicios.map((s) => ({
          value: s.id,
          label: `${s.name} · ${formatMoney(s.price, 'EUR')}`,
        }))}
        placeholder={cargandoServicios ? 'Cargando servicios…' : 'Elige el servicio'}
      />
    );
  }
  return (
    <FieldText<EmitirValores>
      name="importeEuros"
      label="Importe (€)"
      type="number"
      required
      placeholder="50"
    />
  );
}
