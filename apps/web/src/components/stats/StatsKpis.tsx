'use client';

import * as React from 'react';
import { Banknote, CalendarCheck, Receipt, Users } from 'lucide-react';
import { StatCard, StatGrid, ErrorState } from '@/components/common';
import { formatMoneyCompact, formatNumber } from '@/lib/format';
import { useStatsOverview, type StatsRangeParams } from '@/lib/hooks/stats';

export interface StatsKpisProps {
  range: StatsRangeParams;
}

/**
 * KPIs de cabecera del panel (SPEC §7): facturación, citas, clientas atendidas
 * y ticket medio del periodo seleccionado.
 */
export function StatsKpis({ range }: StatsKpisProps): React.JSX.Element {
  const { data, isLoading, error, refetch } = useStatsOverview(range);

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} className="mb-6" />;
  }

  const clients = data ? data.newClients + data.recurringClients : 0;

  return (
    <StatGrid columns={4} className="mb-6">
      <StatCard
        label="Facturación"
        value={data ? formatMoneyCompact(data.revenue, data.currency) : '—'}
        icon={Banknote}
        loading={isLoading}
        hint="Cobros del periodo"
      />
      <StatCard
        label="Citas"
        value={data ? formatNumber(data.bookings) : '—'}
        icon={CalendarCheck}
        loading={isLoading}
      />
      <StatCard
        label="Clientas atendidas"
        value={data ? formatNumber(clients) : '—'}
        icon={Users}
        loading={isLoading}
        {...(data
          ? {
              hint: `${formatNumber(data.newClients)} nuevas · ${formatNumber(
                data.recurringClients,
              )} recurrentes`,
            }
          : {})}
      />
      <StatCard
        label="Ticket medio"
        value={data ? formatMoneyCompact(data.averageTicket, data.currency) : '—'}
        icon={Receipt}
        loading={isLoading}
        hint="Por cobro"
      />
    </StatGrid>
  );
}
