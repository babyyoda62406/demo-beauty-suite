'use client';

import * as React from 'react';
import { CalendarClock, Coins, PalmtreeIcon, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Drawer, ErrorState } from '@/components/common';
import { useEmployee } from '@/lib/hooks/employees';
import { WorkingHoursTab } from './WorkingHoursTab';
import { TimeOffTab } from './TimeOffTab';
import { CommissionsTab } from './CommissionsTab';
import { PerformanceTab } from './PerformanceTab';
import { mediaUrl } from '@/lib/media';

export interface EmployeeDetailDrawerProps {
  employeeId: string | null;
  onOpenChange: (open: boolean) => void;
}

/** Ficha de detalle de un profesional: horarios, ausencias, comisiones y rendimiento. */
export function EmployeeDetailDrawer({ employeeId, onOpenChange }: EmployeeDetailDrawerProps): React.JSX.Element {
  const [tab, setTab] = React.useState('horarios');
  const query = useEmployee(employeeId ?? '', Boolean(employeeId));

  React.useEffect(() => {
    if (employeeId) setTab('horarios');
  }, [employeeId]);

  const employee = query.data;
  const initials = employee?.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Drawer
      open={Boolean(employeeId)}
      onOpenChange={onOpenChange}
      title={employee?.name ?? 'Profesional'}
      description={employee?.title ?? undefined}
      side="right"
      className="sm:max-w-xl"
    >
      {!employeeId ? null : query.isLoading ? (
        <p className="text-sm text-ink-soft/70">Cargando…</p>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : employee ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2" style={{ borderColor: employee.color }}>
              <AvatarImage src={employee.photoUrl ? mediaUrl(employee.photoUrl) : undefined} alt={employee.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="truncate font-serif text-lg font-semibold text-ink">{employee.name}</p>
              {employee.title ? <p className="truncate text-sm text-ink-soft/70">{employee.title}</p> : null}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={employee.active ? 'success' : 'neutral'}>
                  {employee.active ? 'Activo' : 'Inactivo'}
                </Badge>
                <Badge variant={employee.bookable ? 'brand' : 'neutral'}>
                  {employee.bookable ? 'Reservable' : 'No reservable'}
                </Badge>
                {employee.commissionRate != null ? (
                  <Badge variant="neutral">Comisión {(employee.commissionRate / 100).toFixed(0)}%</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="horarios">
                <CalendarClock className="size-4" aria-hidden="true" />
                Horarios
              </TabsTrigger>
              <TabsTrigger value="ausencias">
                <PalmtreeIcon className="size-4" aria-hidden="true" />
                Ausencias
              </TabsTrigger>
              <TabsTrigger value="comisiones">
                <Coins className="size-4" aria-hidden="true" />
                Comisiones
              </TabsTrigger>
              <TabsTrigger value="rendimiento">
                <TrendingUp className="size-4" aria-hidden="true" />
                Rendimiento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="horarios">
              <WorkingHoursTab employeeId={employee.id} />
            </TabsContent>
            <TabsContent value="ausencias">
              <TimeOffTab employeeId={employee.id} />
            </TabsContent>
            <TabsContent value="comisiones">
              <CommissionsTab employeeId={employee.id} hasCommissionRate={employee.commissionRate != null} />
            </TabsContent>
            <TabsContent value="rendimiento">
              <PerformanceTab employeeId={employee.id} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </Drawer>
  );
}
