import { BadRequestException, Injectable } from '@nestjs/common';
import { type BookingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { type RevenueGranularity, type RevenueQueryDto } from './dto/revenue-query.dto';
import { type StatsRangeDto } from './dto/stats-range.dto';
import { type TopServicesQueryDto } from './dto/top-services-query.dto';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;
/** Default look-back window when the caller supplies no date range. */
const DEFAULT_RANGE_DAYS = 30;
/** Upper bound on generated time-series buckets (guards pathological ranges). */
const MAX_BUCKETS = 1000;
/** Fallback currency when the tenant record has none (schema default is EUR). */
const FALLBACK_CURRENCY = 'EUR';
/** Booking states excluded from "delivered work" metrics (revenue, employees). */
const NON_ATTENDED_STATUSES: BookingStatus[] = ['CANCELLED', 'NO_SHOW'];

// -----------------------------------------------------------------------------
// Return shapes (chart-ready — see SPEC §7 "series {label,value}")
// -----------------------------------------------------------------------------

/** A single point of a chart series. `value` units depend on the metric. */
export interface StatSeriesPoint {
  label: string;
  value: number;
}

/** Resolved, echoed-back period for a stats response. */
export interface StatsPeriod {
  from: string;
  to: string;
}

/** Headline KPIs for the dashboard overview. Money in integer cents. */
export interface StatsOverview {
  period: StatsPeriod;
  currency: string;
  /** Total collected (PAID payments) in the period, in cents. */
  revenue: number;
  /** Number of bookings whose start falls in the period. */
  bookings: number;
  /** Clients with a booking in the period first registered within it. */
  newClients: number;
  /** Clients with a booking in the period registered before it. */
  recurringClients: number;
  /** Average collected amount per PAID payment, in cents. */
  averageTicket: number;
}

/** Revenue time series bucketed by the requested granularity. */
export interface RevenueSeries {
  period: StatsPeriod;
  granularity: RevenueGranularity;
  currency: string;
  /** One point per bucket; `value` is collected cents in that bucket. */
  series: StatSeriesPoint[];
}

/** A ranked service by number of bookings and revenue in the period. */
export interface TopServiceStat {
  serviceId: string;
  /** Service name (chart label). */
  label: string;
  /** Number of (attended) bookings — the chart's primary `value`. */
  value: number;
  /** Total booking price in the period, in cents. */
  revenue: number;
}

/** Booking volume grouped by hour of day (0..23, UTC). */
export interface PeakHoursStats {
  period: StatsPeriod;
  series: StatSeriesPoint[];
}

/** Cancellation / no-show breakdown for the period. */
export interface CancellationStats {
  period: StatsPeriod;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  /** Cancelled bookings as a fraction of the total (0..1). */
  cancellationRate: number;
  /** No-show bookings as a fraction of the total (0..1). */
  noShowRate: number;
  /** Count per booking status, ready for a pie/bar chart. */
  series: StatSeriesPoint[];
}

/** Per-employee productivity in the period. */
export interface EmployeeStat {
  employeeId: string;
  /** Employee name (chart label). */
  label: string;
  /** Number of (attended) bookings — the chart's primary `value`. */
  value: number;
  /** Total booking price handled in the period, in cents. */
  revenue: number;
}

/**
 * Read-only statistics domain (SPEC §7 `stats`). Every query is strictly
 * tenant-scoped: the resolved `tenantId` is added to every `where` on top of
 * the Prisma tenant middleware (defence-in-depth, mirroring the CRM module),
 * so aggregates never leak data across salons. Results are shaped as
 * `{label,value}` series ready for the dashboard charts.
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Headline KPIs: revenue, bookings, new vs recurring clients, avg ticket. */
  async overview(tenantId: string, dto: StatsRangeDto): Promise<StatsOverview> {
    const { from, to } = this.resolveRange(dto);

    const [payments, bookings, activeClients, currency] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenantId, status: 'PAID', createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.booking.count({ where: { tenantId, startAt: { gte: from, lte: to } } }),
      this.prisma.booking.groupBy({
        by: ['clientId'],
        where: { tenantId, startAt: { gte: from, lte: to } },
      }),
      this.getCurrency(tenantId),
    ]);

    const revenue = payments._sum.amount ?? 0;
    const paidCount = payments._count;
    const averageTicket = paidCount > 0 ? Math.round(revenue / paidCount) : 0;

    const clientIds = activeClients.map((row) => row.clientId);
    let recurringClients = 0;
    if (clientIds.length > 0) {
      recurringClients = await this.prisma.client.count({
        where: { tenantId, id: { in: clientIds }, createdAt: { lt: from } },
      });
    }
    const newClients = clientIds.length - recurringClients;

    return {
      period: this.periodOf(from, to),
      currency,
      revenue,
      bookings,
      newClients,
      recurringClients,
      averageTicket,
    };
  }

  /** Collected revenue as a time series bucketed by day/week/month. */
  async revenue(tenantId: string, dto: RevenueQueryDto): Promise<RevenueSeries> {
    const { from, to } = this.resolveRange(dto);
    const granularity = dto.granularity;

    const [payments, currency] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, status: 'PAID', createdAt: { gte: from, lte: to } },
        select: { createdAt: true, amount: true },
      }),
      this.getCurrency(tenantId),
    ]);

    const totals = new Map<string, number>();
    for (const payment of payments) {
      const key = this.bucketKey(payment.createdAt, granularity);
      totals.set(key, (totals.get(key) ?? 0) + payment.amount);
    }

    const series = this.bucketKeys(from, to, granularity).map((label) => ({
      label,
      value: totals.get(label) ?? 0,
    }));

    return { period: this.periodOf(from, to), granularity, currency, series };
  }

  /** Most-booked services in the period (attended bookings), by volume. */
  async topServices(tenantId: string, dto: TopServicesQueryDto): Promise<TopServiceStat[]> {
    const { from, to } = this.resolveRange(dto);

    const rows = await this.prisma.booking.groupBy({
      by: ['serviceId'],
      where: {
        tenantId,
        startAt: { gte: from, lte: to },
        status: { notIn: NON_ATTENDED_STATUSES },
      },
      _count: true,
      _sum: { price: true },
    });

    rows.sort((a, b) => b._count - a._count);
    const top = rows.slice(0, dto.limit);

    const names = await this.resolveNames(
      'service',
      top.map((row) => row.serviceId),
    );

    return top.map((row) => ({
      serviceId: row.serviceId,
      label: names.get(row.serviceId) ?? 'Servicio eliminado',
      value: row._count,
      revenue: row._sum?.price ?? 0,
    }));
  }

  /** Booking volume by hour of day (0..23, UTC) — reveals busy slots. */
  async peakHours(tenantId: string, dto: StatsRangeDto): Promise<PeakHoursStats> {
    const { from, to } = this.resolveRange(dto);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        startAt: { gte: from, lte: to },
        status: { notIn: NON_ATTENDED_STATUSES },
      },
      select: { startAt: true },
    });

    const counts = new Array<number>(24).fill(0);
    for (const booking of bookings) {
      // TODO(integration): bucket by the tenant timezone instead of UTC.
      const hour = booking.startAt.getUTCHours();
      counts[hour] = (counts[hour] ?? 0) + 1;
    }

    const series = counts.map((value, hour) => ({
      label: `${String(hour).padStart(2, '0')}:00`,
      value,
    }));

    return { period: this.periodOf(from, to), series };
  }

  /** Cancellation and no-show breakdown with rates over the period. */
  async cancellations(tenantId: string, dto: StatsRangeDto): Promise<CancellationStats> {
    const { from, to } = this.resolveRange(dto);

    const rows = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { tenantId, startAt: { gte: from, lte: to } },
      _count: true,
    });

    const byStatus = new Map<BookingStatus, number>();
    let total = 0;
    for (const row of rows) {
      byStatus.set(row.status, row._count);
      total += row._count;
    }

    const cancelled = byStatus.get('CANCELLED') ?? 0;
    const noShow = byStatus.get('NO_SHOW') ?? 0;
    const completed = byStatus.get('COMPLETED') ?? 0;

    return {
      period: this.periodOf(from, to),
      total,
      completed,
      cancelled,
      noShow,
      cancellationRate: total > 0 ? cancelled / total : 0,
      noShowRate: total > 0 ? noShow / total : 0,
      series: rows.map((row) => ({ label: row.status, value: row._count })),
    };
  }

  /** Per-employee productivity (attended bookings and revenue) in the period. */
  async employees(tenantId: string, dto: StatsRangeDto): Promise<EmployeeStat[]> {
    const { from, to } = this.resolveRange(dto);

    const rows = await this.prisma.booking.groupBy({
      by: ['employeeId'],
      where: {
        tenantId,
        employeeId: { not: null },
        startAt: { gte: from, lte: to },
        status: { notIn: NON_ATTENDED_STATUSES },
      },
      _count: true,
      _sum: { price: true },
    });

    const employeeIds = rows
      .map((row) => row.employeeId)
      .filter((id): id is string => id !== null);
    const names = await this.resolveNames('employee', employeeIds);

    const stats: EmployeeStat[] = [];
    for (const row of rows) {
      if (row.employeeId === null) {
        continue;
      }
      stats.push({
        employeeId: row.employeeId,
        label: names.get(row.employeeId) ?? 'Empleado eliminado',
        value: row._count,
        revenue: row._sum?.price ?? 0,
      });
    }

    stats.sort((a, b) => b.revenue - a.revenue);
    return stats;
  }

  // --- helpers ---------------------------------------------------------------

  /** Resolves the effective [from, to] window (defaults to the last 30 days). */
  private resolveRange(dto: StatsRangeDto): { from: Date; to: Date } {
    const to = dto.to ? new Date(dto.to) : new Date();
    const from = dto.from
      ? new Date(dto.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Fechas de periodo no válidas');
    }
    if (from > to) {
      throw new BadRequestException('El inicio del periodo no puede ser posterior al fin');
    }
    return { from, to };
  }

  private periodOf(from: Date, to: Date): StatsPeriod {
    return { from: from.toISOString(), to: to.toISOString() };
  }

  /** Reads the tenant's ISO currency (Tenant is not tenant-scoped middleware). */
  private async getCurrency(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    return tenant?.currency ?? FALLBACK_CURRENCY;
  }

  /** Maps a set of ids to their `name` for the given tenant-scoped model. */
  private async resolveNames(
    model: 'service' | 'employee',
    ids: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return map;
    }
    const rows =
      model === 'service'
        ? await this.prisma.service.findMany({
            where: { id: { in: unique } },
            select: { id: true, name: true },
          })
        : await this.prisma.employee.findMany({
            where: { id: { in: unique } },
            select: { id: true, name: true },
          });
    for (const row of rows) {
      map.set(row.id, row.name);
    }
    return map;
  }

  /** Bucket key for a timestamp at the given granularity (sorts lexically). */
  private bucketKey(date: Date, granularity: RevenueGranularity): string {
    if (granularity === 'month') {
      return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
    }
    if (granularity === 'week') {
      return isoDate(startOfWeekUtc(date));
    }
    return isoDate(date);
  }

  /** Ordered list of bucket keys spanning [from, to] inclusive. */
  private bucketKeys(from: Date, to: Date, granularity: RevenueGranularity): string[] {
    const keys: string[] = [];
    const cursor = this.bucketStart(from, granularity);
    const end = to.getTime();
    let guard = 0;
    while (cursor.getTime() <= end && guard < MAX_BUCKETS) {
      keys.push(this.bucketKey(cursor, granularity));
      this.advance(cursor, granularity);
      guard += 1;
    }
    return keys;
  }

  /** Truncates a date down to the start of its bucket (UTC). */
  private bucketStart(date: Date, granularity: RevenueGranularity): Date {
    if (granularity === 'month') {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    }
    if (granularity === 'week') {
      return startOfWeekUtc(date);
    }
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  /** Advances a bucket cursor in place to the next bucket. */
  private advance(cursor: Date, granularity: RevenueGranularity): void {
    if (granularity === 'month') {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    } else if (granularity === 'week') {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
}

// -----------------------------------------------------------------------------
// Date helpers (UTC, module-private)
// -----------------------------------------------------------------------------

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYY-MM-DD` of a date's UTC calendar day. */
function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
function startOfWeekUtc(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diff = weekday === 0 ? -6 : 1 - weekday;
  day.setUTCDate(day.getUTCDate() + diff);
  return day;
}
