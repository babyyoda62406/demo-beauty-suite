'use client';

/**
 * Capa de datos del dominio Estadísticas (SPEC §7 `stats`): KPIs del salón,
 * series de facturación, ranking de servicios, horas pico, cancelaciones y
 * productividad por empleada. Sobre `useApiQuery` (lib/hooks/use-api.ts), que
 * ya habla con el BFF (`/api/proxy/<path>` → `/api/v1/<path>`).
 *
 * Rutas exactas verificadas en apps/api/src/modules/stats/stats.controller.ts.
 * Todos los importes llegan en céntimos (Int) → formatéalos con lib/format.ts.
 */
import { useApiQuery } from './use-api';

// -----------------------------------------------------------------------------
// Tipos de dominio (forma tal cual la sirve la API; fechas ISO string, dinero cts)
// -----------------------------------------------------------------------------

/** Un punto de una serie apta para gráfica. */
export interface StatSeriesPoint {
  label: string;
  value: number;
}

/** Periodo resuelto y devuelto por la API (ISO-8601). */
export interface StatsPeriod {
  from: string;
  to: string;
}

/** Tamaño de intervalo para la serie de facturación. */
export type RevenueGranularity = 'day' | 'week' | 'month';

/** KPIs de cabecera del panel. Dinero en céntimos. */
export interface StatsOverview {
  period: StatsPeriod;
  currency: string;
  /** Total cobrado (pagos PAID) en el periodo, en céntimos. */
  revenue: number;
  /** Nº de citas cuyo inicio cae en el periodo. */
  bookings: number;
  /** Clientas con cita en el periodo registradas dentro de él. */
  newClients: number;
  /** Clientas con cita en el periodo registradas antes de él. */
  recurringClients: number;
  /** Importe medio por pago PAID, en céntimos. */
  averageTicket: number;
}

/** Serie temporal de facturación por granularidad. */
export interface RevenueSeries {
  period: StatsPeriod;
  granularity: RevenueGranularity;
  currency: string;
  /** Un punto por bucket; `value` en céntimos cobrados en ese bucket. */
  series: StatSeriesPoint[];
}

/** Servicio del ranking por nº de citas y facturación en el periodo. */
export interface TopServiceStat {
  serviceId: string;
  label: string;
  /** Nº de citas (atendidas) — valor principal de la gráfica. */
  value: number;
  /** Precio total de las citas en el periodo, en céntimos. */
  revenue: number;
}

/** Volumen de citas por hora del día (0..23, UTC). */
export interface PeakHoursStats {
  period: StatsPeriod;
  series: StatSeriesPoint[];
}

/** Desglose de cancelaciones / ausencias del periodo. */
export interface CancellationStats {
  period: StatsPeriod;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  /** Cancelaciones como fracción del total (0..1). */
  cancellationRate: number;
  /** Ausencias (no-show) como fracción del total (0..1). */
  noShowRate: number;
  /** Conteo por estado de cita, listo para tarta/barras. */
  series: StatSeriesPoint[];
}

/** Productividad por empleada en el periodo. */
export interface EmployeeStat {
  employeeId: string;
  label: string;
  /** Nº de citas (atendidas) — valor principal de la gráfica. */
  value: number;
  /** Facturación gestionada en el periodo, en céntimos. */
  revenue: number;
}

// -----------------------------------------------------------------------------
// Parámetros de consulta
// -----------------------------------------------------------------------------

/** Rango de fechas (ISO-8601) común a todos los endpoints de estadísticas. */
export interface StatsRangeParams {
  from?: string;
  to?: string;
}

export interface RevenueParams extends StatsRangeParams {
  granularity?: RevenueGranularity;
}

export interface TopServicesParams extends StatsRangeParams {
  limit?: number;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

const keys = {
  overview: (p: StatsRangeParams) => ['stats', 'overview', p] as const,
  revenue: (p: RevenueParams) => ['stats', 'revenue', p] as const,
  topServices: (p: TopServicesParams) => ['stats', 'top-services', p] as const,
  peakHours: (p: StatsRangeParams) => ['stats', 'peak-hours', p] as const,
  cancellations: (p: StatsRangeParams) => ['stats', 'cancellations', p] as const,
  employees: (p: StatsRangeParams) => ['stats', 'employees', p] as const,
};

/** Serializa los parámetros de rango a query params (omite indefinidos). */
function rangeQuery(
  params: Record<string, string | number | undefined>,
): Record<string, string | number | undefined> {
  return params;
}

// -----------------------------------------------------------------------------
// Hooks de lectura
// -----------------------------------------------------------------------------

/** KPIs de cabecera: facturación, citas, clientas nuevas/recurrentes y ticket medio. */
export function useStatsOverview(params: StatsRangeParams = {}) {
  return useApiQuery<StatsOverview>(keys.overview(params), 'stats/overview', {
    query: rangeQuery({ ...params }),
  });
}

/** Serie temporal de facturación por granularidad (día/semana/mes). */
export function useStatsRevenue(params: RevenueParams = {}) {
  return useApiQuery<RevenueSeries>(keys.revenue(params), 'stats/revenue', {
    query: rangeQuery({ ...params }),
  });
}

/** Ranking de servicios más reservados en el periodo. */
export function useTopServices(params: TopServicesParams = {}) {
  return useApiQuery<TopServiceStat[]>(keys.topServices(params), 'stats/top-services', {
    query: rangeQuery({ ...params }),
  });
}

/** Volumen de citas por hora del día. */
export function usePeakHours(params: StatsRangeParams = {}) {
  return useApiQuery<PeakHoursStats>(keys.peakHours(params), 'stats/peak-hours', {
    query: rangeQuery({ ...params }),
  });
}

/** Cancelaciones y ausencias del periodo con sus tasas. */
export function useCancellations(params: StatsRangeParams = {}) {
  return useApiQuery<CancellationStats>(keys.cancellations(params), 'stats/cancellations', {
    query: rangeQuery({ ...params }),
  });
}

/** Productividad por empleada: citas atendidas y facturación. */
export function useEmployeeStats(params: StatsRangeParams = {}) {
  return useApiQuery<EmployeeStat[]>(keys.employees(params), 'stats/employees', {
    query: rangeQuery({ ...params }),
  });
}
