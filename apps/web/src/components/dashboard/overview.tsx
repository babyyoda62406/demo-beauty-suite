import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@fgd/ui';
import { cn } from '@/lib/utils';
import { MiniChart } from './mini-chart';

export interface StatCard {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
}

interface OverviewProps {
  title: string;
  subtitle: string;
  stats: StatCard[];
  /** Title for the main chart panel. */
  chartTitle: string;
  /** Title for the side list panel. */
  listTitle: string;
}

/**
 * Generic dashboard skeleton shared by every area: greeting, KPI row, a chart
 * panel and a placeholder activity list. Real widgets replace these later.
 */
export function DashboardOverview({
  title,
  subtitle,
  stats,
  chartTitle,
  listTitle,
}: OverviewProps): React.JSX.Element {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        <p className="text-sm text-ink-soft/70">{subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="flex items-start justify-between p-6">
                <div>
                  <p className="text-sm text-ink-soft/70">{stat.label}</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-ink">{stat.value}</p>
                  {stat.delta ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-success">
                      <ArrowUpRight className="size-3.5" />
                      {stat.delta}
                    </p>
                  ) : null}
                </div>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{chartTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{listTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TODO(fase-modulos): reemplazar por datos reales del módulo. */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className={cn('h-3', i % 2 === 0 ? 'w-3/4' : 'w-1/2')} />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
