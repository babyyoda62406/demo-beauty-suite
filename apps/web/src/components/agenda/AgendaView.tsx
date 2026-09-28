'use client';

/**
 * Orquestador de la AGENDA del salón (SPEC §7 — pantalla estrella).
 *
 * Compone: controles de navegación (día/semana/mes, anterior/hoy/siguiente),
 * filtro/leyenda por profesional, el calendario (FullCalendar, cargado con
 * `next/dynamic({ ssr:false })`), el panel de lista de espera y los modales de
 * creación y detalle. Mantiene el estado de vista/fecha/rango/filtro y conecta
 * las mutaciones de la máquina de estados.
 */
import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button, Card, Skeleton, useToast } from '@/components/ui';
import { PageHeader, ErrorState } from '@/components/common';
import { cn } from '@/lib/utils';
import { formatDate, formatDateRange, formatWeekday } from '@/lib/format';
import {
  bookingKeys,
  useAgendaEmployees,
  useAgendaServices,
  useBookings,
  useRescheduleBooking,
  type AgendaBooking,
} from '@/lib/hooks/bookings';
import { VIEW_LABEL, type AgendaViewId } from './agenda-utils';
import { EmployeeFilter } from './EmployeeFilter';
import { WaitlistPanel } from './WaitlistPanel';
import { BookingFormDialog } from './BookingFormDialog';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import type { AgendaCalendarProps } from './AgendaCalendar';

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** Rango visible que pintará FullCalendar para una vista/fecha dadas. */
function visibleRange(date: Date, view: AgendaViewId): { from: Date; to: Date } {
  if (view === 'day') return { from: startOfDay(date), to: endOfDay(date) };
  if (view === 'week') {
    return { from: startOfWeek(date, WEEK_OPTS), to: endOfWeek(date, WEEK_OPTS) };
  }
  return {
    from: startOfWeek(startOfMonth(date), WEEK_OPTS),
    to: endOfWeek(endOfMonth(date), WEEK_OPTS),
  };
}

/** Etiqueta legible del periodo actual. */
function periodLabel(date: Date, view: AgendaViewId): string {
  if (view === 'day') return `${formatWeekday(date)}, ${formatDate(date)}`;
  if (view === 'month') return formatDate(date, 'LLLL yyyy').replace(/^\w/, (c) => c.toUpperCase());
  return formatDateRange({ from: startOfWeek(date, WEEK_OPTS), to: endOfWeek(date, WEEK_OPTS) });
}

/** Calendario cargado en cliente (usa APIs de navegador → sin SSR). */
const AgendaCalendar = dynamic<AgendaCalendarProps>(() => import('./AgendaCalendar'), {
  ssr: false,
  loading: () => <Skeleton className="h-[640px] w-full rounded-2xl" />,
});

export function AgendaView(): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // En el móvil la semana no cabe: siete columnas en 390 px dejan las citas
  // reducidas a un cuadro gris ilegible. Se arranca en «Día», y el selector
  // sigue permitiendo semana o mes a quien lo quiera.
  const [view, setView] = React.useState<AgendaViewId>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'day' : 'week',
  );
  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const [employeeId, setEmployeeId] = React.useState<string | undefined>(undefined);
  const [range, setRange] = React.useState<{ from: Date; to: Date }>(() =>
    visibleRange(
      new Date(),
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'day' : 'week',
    ),
  );

  const [formOpen, setFormOpen] = React.useState(false);
  const [slotStart, setSlotStart] = React.useState<Date | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AgendaBooking | null>(null);

  const employeesQuery = useAgendaEmployees();
  const servicesQuery = useAgendaServices();
  const bookingsQuery = useBookings({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    employeeId,
  });
  const reschedule = useRescheduleBooking();

  const bookings = bookingsQuery.data?.data ?? [];
  const employees = employeesQuery.data ?? [];
  const services = servicesQuery.data ?? [];

  // --- Navegación ------------------------------------------------------------
  const goToday = (): void => setAnchor(new Date());
  const step = (dir: 1 | -1): void => {
    setAnchor((prev) => {
      if (view === 'day') return addDays(prev, dir);
      if (view === 'week') return addDays(prev, dir * 7);
      return addMonths(prev, dir);
    });
  };
  const changeView = (next: AgendaViewId): void => {
    setView(next);
    setRange(visibleRange(anchor, next));
  };

  const handleRangeChange = React.useCallback((start: Date, end: Date) => {
    setRange({ from: start, to: end });
  }, []);

  // --- Interacciones del calendario -----------------------------------------
  const handleCreateSlot = React.useCallback((start: Date) => {
    setSlotStart(start);
    setFormOpen(true);
  }, []);

  const handleSelectBooking = React.useCallback((booking: AgendaBooking) => {
    setSelected(booking);
    setDetailOpen(true);
  }, []);

  const handleReschedule = React.useCallback(
    async (id: string, newStart: Date) => {
      try {
        await reschedule.mutateAsync({ id, startAt: newStart.toISOString() });
        toast({ title: 'Cita reprogramada', variant: 'success' });
      } catch (error) {
        toast({
          title: 'No se pudo reprogramar',
          description: error instanceof Error ? error.message : undefined,
          variant: 'danger',
        });
        // Revierte la posición optimista volviendo a la verdad del servidor.
        void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      }
    },
    [reschedule, toast, queryClient],
  );

  const openNewBooking = (): void => {
    setSlotStart(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda"
        description="Gestiona las citas del salón: crea, reprograma y actualiza su estado."
        actions={
          <Button onClick={openNewBooking}>
            <CalendarPlus aria-hidden="true" /> Nueva cita
          </Button>
        }
      />

      {/* Controles */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-brand-100 bg-white p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => step(-1)}
              aria-label="Periodo anterior"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="h-9">
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => step(1)}
              aria-label="Periodo siguiente"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <h2 className="min-w-0 truncate font-serif text-lg font-semibold text-ink">
            {periodLabel(anchor, view)}
          </h2>
          {bookingsQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin text-brand-400" aria-hidden="true" />
          ) : null}
        </div>

        {/* Selector de vista */}
        <div
          className="inline-flex rounded-xl border border-brand-100 bg-white p-0.5"
          role="group"
          aria-label="Cambiar vista"
        >
          {(['day', 'week', 'month'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => changeView(v)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
                view === v
                  ? 'bg-brand-gradient text-white shadow-soft'
                  : 'text-ink-soft hover:bg-brand-50',
              )}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      {employees.length > 0 ? (
        <EmployeeFilter employees={employees} value={employeeId} onChange={setEmployeeId} />
      ) : null}

      {/* Calendario + lista de espera */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-3 sm:p-4">
          {bookingsQuery.isError ? (
            <ErrorState
              error={bookingsQuery.error}
              onRetry={() => void bookingsQuery.refetch()}
              className="py-16"
            />
          ) : (
            <AgendaCalendar
              bookings={bookings}
              view={view}
              date={anchor}
              onRangeChange={handleRangeChange}
              onSelectBooking={handleSelectBooking}
              onCreateSlot={handleCreateSlot}
              onReschedule={handleReschedule}
            />
          )}
        </Card>

        <aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-6rem)]">
          <WaitlistPanel />
        </aside>
      </div>

      <BookingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        slotStart={slotStart}
        defaultEmployeeId={employeeId}
        services={services}
        employees={employees}
      />

      <BookingDetailDrawer booking={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
