'use client';

import * as React from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { MoneyText, getErrorMessage } from '@/components/common';
import { useDevolverTarjeta, useMovimientosTarjeta, type TarjetaRegaloApi } from '@/lib/hooks/gift-cards';

/**
 * Historial de una tarjeta, con la posibilidad de deshacer un descuento.
 *
 * Descontar de más pasa —un cero de sobra, la tarjeta equivocada—, y hasta
 * ahora la única salida era tocar la base de datos. Cada movimiento queda
 * registrado, también las devoluciones.
 */
export function Movimientos({ tarjeta }: { tarjeta: TarjetaRegaloApi }): React.JSX.Element {
  const query = useMovimientosTarjeta(tarjeta.id);
  const devolver = useDevolverTarjeta();

  if (query.isLoading) {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-ink-soft">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando movimientos…
      </p>
    );
  }

  const movimientos = query.data ?? [];
  if (movimientos.length === 0) {
    return (
      <p className="py-4 text-sm text-ink-soft/70">
        Todavía no se ha usado. Aquí irá apareciendo cada descuento.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-brand-100/70">
      {movimientos.map((m) => {
        const esDescuento = m.amount < 0;
        return (
          <li key={m.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {esDescuento ? 'Descuento' : 'Devolución'}
                {m.reason ? <span className="text-ink-soft"> · {m.reason}</span> : null}
              </p>
              <p className="text-xs text-ink-soft/70">
                {new Date(m.createdAt).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · quedaron '}
                <MoneyText cents={m.balance} currency={tarjeta.currency} />
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <MoneyText
                cents={m.amount}
                currency={tarjeta.currency}
                showSign
                className={esDescuento ? 'text-ink' : 'text-emerald-700'}
              />
              {esDescuento ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={devolver.isPending}
                  onClick={() =>
                    devolver.mutate(
                      { id: tarjeta.id, amount: -m.amount, reason: 'Se deshizo un descuento' },
                      {
                        onSuccess: () => {
                          toast({ title: 'Descuento deshecho', variant: 'success' });
                          void query.refetch();
                        },
                        onError: (error) =>
                          toast({
                            title: 'No se ha podido deshacer',
                            description: getErrorMessage(error),
                            variant: 'danger',
                          }),
                      },
                    )
                  }
                >
                  <RotateCcw aria-hidden="true" />
                  Deshacer
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
