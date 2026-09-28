'use client';

import * as React from 'react';
import { Banknote, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { StatCard, StatGrid, ErrorState } from '@/components/common';
import { formatMoneyCompact } from '@/lib/format';
import { useCashRegisterSummary } from '@/lib/hooks/cash';

/** KPIs del día para la caja: ingresos, tickets, gastos y neto (SPEC §6). */
export function CajaKpis(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useCashRegisterSummary();

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} className="mb-6" />;
  }

  return (
    <StatGrid columns={4} className="mb-6">
      <StatCard
        label="Ingresos de hoy"
        value={data ? formatMoneyCompact(data.income.total, data.currency) : '—'}
        icon={Banknote}
        loading={isLoading}
        {...(data ? { hint: `${data.income.count} ${data.income.count === 1 ? 'cobro' : 'cobros'}` } : {})}
      />
      <StatCard
        label="Tickets cobrados"
        value={data ? String(data.income.count) : '—'}
        icon={Receipt}
        loading={isLoading}
      />
      <StatCard
        label="Gastos de hoy"
        value={data ? formatMoneyCompact(data.expenses.total, data.currency) : '—'}
        icon={Wallet}
        loading={isLoading}
        {...(data ? { hint: `${data.expenses.count} ${data.expenses.count === 1 ? 'gasto' : 'gastos'}` } : {})}
      />
      <StatCard
        label="Neto de hoy"
        value={data ? formatMoneyCompact(data.net, data.currency) : '—'}
        icon={TrendingUp}
        loading={isLoading}
      />
    </StatGrid>
  );
}
