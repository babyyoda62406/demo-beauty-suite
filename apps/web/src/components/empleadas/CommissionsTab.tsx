'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calculator, Coins } from 'lucide-react';
import { Button, Input, Label, Skeleton, toast } from '@/components/ui';
import { EmptyState, ErrorState, getErrorMessage, MoneyCell, MoneyText, DateCell, StatusBadge } from '@/components/common';
import { useEmployeeCommissions, useCalculateCommissions } from '@/lib/hooks/employees';

export interface CommissionsTabProps {
  employeeId: string;
  /** Si el profesional no tiene tasa de comisión configurada, se deshabilita el cálculo. */
  hasCommissionRate: boolean;
}

/** Pestaña Comisiones: listado por periodo (YYYY-MM) + cálculo idempotente. */
export function CommissionsTab({ employeeId, hasCommissionRate }: CommissionsTabProps): React.JSX.Element {
  const [period, setPeriod] = React.useState(() => format(new Date(), 'yyyy-MM'));
  const query = useEmployeeCommissions(employeeId, { period });
  const calculate = useCalculateCommissions();

  const total = React.useMemo(
    () => (query.data ?? []).reduce((sum, c) => sum + c.amount, 0),
    [query.data],
  );

  const handleCalculate = async (): Promise<void> => {
    try {
      const result = await calculate.mutateAsync({ employeeId, period });
      toast({
        title: 'Comisiones calculadas',
        description: `${result.created} nuevas, ${result.skipped} ya existentes.`,
        variant: 'success',
      });
    } catch (error) {
      toast({ title: 'No se pudo calcular', description: getErrorMessage(error), variant: 'danger' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="commission-period">Periodo</Label>
          <Input
            id="commission-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-44"
          />
        </div>
        <Button size="sm" onClick={handleCalculate} disabled={!hasCommissionRate || calculate.isPending}>
          <Calculator className="size-4" aria-hidden="true" />
          Calcular comisiones
        </Button>
      </div>

      {!hasCommissionRate ? (
        <p className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-ink-soft">
          Este profesional no tiene una tasa de comisión configurada; edítalo para poder calcular comisiones.
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={Coins}
          title="Sin comisiones en este periodo"
          description="Calcula las comisiones a partir de las citas completadas del periodo seleccionado."
        />
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
            <span className="text-sm font-medium text-ink-soft">Total del periodo</span>
            <MoneyText cents={total} className="text-base font-semibold text-brand-600" />
          </div>
          <ul className="space-y-2">
            {(query.data ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-brand-100/70 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <MoneyCell cents={c.amount} currency={c.currency} />
                  <p className="text-xs text-ink-soft/70">
                    <DateCell value={c.createdAt} withTime />
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
