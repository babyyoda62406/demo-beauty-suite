'use client';

import * as React from 'react';
import { Gift, Loader2, Minus, Plus, Stamp } from 'lucide-react';
import { Badge, Button, toast } from '@/components/ui';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SearchInput,
  Toolbar,
  getErrorMessage,
} from '@/components/common';
import {
  SELLOS_POR_PREMIO,
  useAddStamp,
  useLoyaltyCards,
  useRedeemReward,
  useRemoveStamp,
  type LoyaltyCard,
} from '@/lib/hooks/loyalty';
import { cn } from '@/lib/utils';

/** Los 10 huecos de la tarjeta, para verla de un vistazo como la de papel. */
function Sellos({ cantidad }: { cantidad: number }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`${cantidad} de ${SELLOS_POR_PREMIO} sellos`}>
      {Array.from({ length: SELLOS_POR_PREMIO }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'flex size-6 items-center justify-center rounded-full border text-[0.6rem] font-semibold',
            i < cantidad
              ? 'border-brand-500 bg-brand-gradient text-white shadow-soft'
              : 'border-dashed border-brand-200 text-brand-200',
          )}
        >
          {i < cantidad ? '★' : i + 1}
        </span>
      ))}
    </div>
  );
}

/**
 * Fidelización: las tarjetas de sellos del salón.
 *
 * Hasta ahora los sellos solo se ponían solos al completar una cita, así que no
 * había forma de sellar a mano, corregir un error ni entregar el premio. Aquí
 * están las tres cosas.
 */
export default function FidelizacionPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const pageSize = 12;

  const query = useLoyaltyCards({
    page,
    pageSize,
    ...(search ? { search } : {}),
  });
  const sellar = useAddStamp();
  const quitar = useRemoveStamp();
  const canjear = useRedeemReward();
  const [aCanjear, setACanjear] = React.useState<LoyaltyCard | undefined>(undefined);

  const ocupada = sellar.isPending || quitar.isPending || canjear.isPending;

  const conError = (accion: string) => (error: unknown) =>
    toast({ title: accion, description: getErrorMessage(error), variant: 'danger' });

  const cards = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fidelización"
        description={`Tarjetas de sellos de tus clientas. Cada ${SELLOS_POR_PREMIO} sellos, un servicio gratis.`}
        icon={<Stamp className="size-6" aria-hidden="true" />}
      />

      <Toolbar
        start={
          <SearchInput
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Buscar clienta…"
          />
        }
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <p className="text-sm text-ink-soft">Cargando tarjetas…</p>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Stamp}
          title="Todavía no hay tarjetas"
          description="Se crean solas la primera vez que una clienta gana un sello al completar su cita."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex flex-col gap-4 rounded-2xl border border-brand-100/70 bg-white p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {card.client?.name ?? 'Clienta'}
                  </p>
                  {card.client?.phone ? (
                    <p className="truncate text-xs text-ink-soft/70">{card.client.phone}</p>
                  ) : null}
                </div>
                {card.freeEarned > 0 ? (
                  <Badge variant="solid" className="shrink-0">
                    <Gift className="mr-1 size-3" aria-hidden="true" />
                    {card.freeEarned} gratis
                  </Badge>
                ) : null}
              </div>

              <Sellos cantidad={card.stamps} />

              <p className="text-xs text-ink-soft/70">
                {card.stamps} de {SELLOS_POR_PREMIO} sellos
                {card.redeemedCount > 0 ? ` · ${card.redeemedCount} ya canjeados` : ''}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={ocupada}
                  onClick={() =>
                    sellar.mutate(
                      { id: card.id, reason: 'MANUAL' },
                      {
                        onSuccess: () => toast({ title: 'Sello añadido', variant: 'success' }),
                        onError: conError('No se ha podido sellar'),
                      },
                    )
                  }
                >
                  {sellar.isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden="true" />}
                  Sellar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={ocupada || (card.stamps === 0 && card.freeEarned === 0)}
                  onClick={() =>
                    quitar.mutate(
                      { id: card.id },
                      {
                        onSuccess: () => toast({ title: 'Sello quitado' }),
                        onError: conError('No se ha podido quitar'),
                      },
                    )
                  }
                >
                  <Minus aria-hidden="true" />
                  Quitar
                </Button>

                {card.freeEarned > 0 ? (
                  <Button size="sm" variant="ink" disabled={ocupada} onClick={() => setACanjear(card)}>
                    <Gift aria-hidden="true" />
                    Canjear premio
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
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

      <ConfirmDialog
        open={Boolean(aCanjear)}
        onOpenChange={(open) => !open && setACanjear(undefined)}
        title="Entregar el servicio gratis"
        description={`Se descontará un premio de la tarjeta de ${aCanjear?.client?.name ?? 'la clienta'}. Hazlo cuando ya se lo hayas hecho.`}
        confirmLabel="Entregar"
        onConfirm={async () => {
          if (!aCanjear) return;
          try {
            await canjear.mutateAsync({ id: aCanjear.id, reason: 'MANUAL' });
            toast({ title: 'Premio entregado', variant: 'success' });
          } catch (error) {
            conError('No se ha podido canjear')(error);
            throw error;
          }
        }}
      />
    </div>
  );
}
