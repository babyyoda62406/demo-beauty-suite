import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BookingStatus,
  type Commission,
  type CommissionStatus,
  type Employee,
  type Prisma,
  type TimeOff,
  type WorkingHours,
} from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateEmployeeDto } from './dto/create-employee.dto';
import {
  type CreateEmployeeWorkingHoursDto,
  type UpdateEmployeeWorkingHoursDto,
} from './dto/employee-schedule.dto';
import {
  type CreateEmployeeTimeOffDto,
  type UpdateEmployeeTimeOffDto,
} from './dto/employee-time-off.dto';
import { type QueryEmployeesDto } from './dto/query-employees.dto';
import { type UpdateEmployeeDto } from './dto/update-employee.dto';

/** Whitelisted, safe columns for employee ordering (avoids injection via sortBy). */
const EMPLOYEE_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'name',
  'title',
  'hireDate',
  'createdAt',
  'updatedAt',
]);

/** Basis-points denominator (10000 bp = 100%). */
const BASIS_POINTS = 10000;

/** Public projection of a bookable employee for the web (no sensitive fields). */
export interface PublicTeamMember {
  id: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  color: string;
  bio: string | null;
  specialties: string | null;
}

/** Aggregated performance figures for an employee within a window. */
export interface EmployeePerformance {
  employeeId: string;
  from: Date;
  to: Date;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  /** Revenue from COMPLETED bookings, in cents. */
  revenue: number;
  currency: string;
}

/** Outcome of a commission (re)calculation run for a period. */
export interface CommissionCalculationResult {
  period: string;
  created: number;
  skipped: number;
  totalAmount: number;
  commissions: Commission[];
}

/**
 * Employees (professionals) domain: CRUD plus per-employee schedule
 * ({@link WorkingHours}), time-off ({@link TimeOff}), commission calculation
 * from COMPLETED bookings, and performance aggregates. Every query is strictly
 * tenant-scoped (SPEC §3/§6): reads filter by the resolved `tenantId` on top of
 * the Prisma tenant middleware, and single-row updates/deletes assert ownership
 * first (the middleware cannot scope unique-`where` writes — see `PrismaService`).
 */
@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- CRUD ------------------------------------------------------------------

  async create(tenantId: string, dto: CreateEmployeeDto): Promise<Employee> {
    if (dto.userId) {
      await this.assertUserAvailable(tenantId, dto.userId);
    }
    return this.prisma.employee.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        title: dto.title?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        email: dto.email?.trim().toLowerCase() ?? null,
        photoUrl: dto.photoUrl ?? null,
        ...(dto.color ? { color: dto.color } : {}),
        commissionRate: dto.commissionRate ?? null,
        salary: dto.salary ?? null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.bookable !== undefined ? { bookable: dto.bookable } : {}),
        bio: dto.bio ?? null,
        specialties: dto.specialties ?? null,
        userId: dto.userId ?? null,
      },
    });
  }

  /** Paginated listing with free-text search and active/bookable filters. */
  async list(tenantId: string, query: QueryEmployeesDto): Promise<PaginatedResult<Employee>> {
    const where: Prisma.EmployeeWhereInput = { tenantId };
    if (query.active !== undefined) where.active = query.active;
    if (query.bookable !== undefined) where.bookable = query.bookable;
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { specialties: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.resolveOrder(query.sortBy, query.sortOrder);
    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.employee.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /** Returns a single employee scoped to the tenant (throws if missing). */
  async getEmployee(tenantId: string, id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) {
      throw new NotFoundException('Profesional no encontrado');
    }
    return employee;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    await this.getEmployee(tenantId, id);
    if (dto.userId) {
      await this.assertUserAvailable(tenantId, dto.userId, id);
    }

    const data: Prisma.EmployeeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.title !== undefined) data.title = dto.title?.trim() ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() ?? null;
    if (dto.email !== undefined) data.email = dto.email?.trim().toLowerCase() ?? null;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl ?? null;
    if (dto.color !== undefined && dto.color) data.color = dto.color;
    if (dto.commissionRate !== undefined) data.commissionRate = dto.commissionRate ?? null;
    if (dto.salary !== undefined) data.salary = dto.salary ?? null;
    if (dto.hireDate !== undefined) data.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.bookable !== undefined) data.bookable = dto.bookable;
    if (dto.bio !== undefined) data.bio = dto.bio ?? null;
    if (dto.specialties !== undefined) data.specialties = dto.specialties ?? null;

    return this.prisma.employee.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.getEmployee(tenantId, id);
    await this.prisma.employee.delete({ where: { id } });
  }

  /** Bookable, active team members for the public site (safe projection). */
  async listPublicTeam(tenantId: string): Promise<PublicTeamMember[]> {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, active: true, bookable: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        title: true,
        photoUrl: true,
        color: true,
        bio: true,
        specialties: true,
      },
    });
    return employees;
  }

  // --- Schedule (WorkingHours) ----------------------------------------------

  async listSchedule(tenantId: string, employeeId: string): Promise<WorkingHours[]> {
    await this.getEmployee(tenantId, employeeId);
    return this.prisma.workingHours.findMany({
      where: { tenantId, employeeId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async addSchedule(
    tenantId: string,
    employeeId: string,
    dto: CreateEmployeeWorkingHoursDto,
  ): Promise<WorkingHours> {
    await this.getEmployee(tenantId, employeeId);
    this.assertTimeOrder(dto.startTime, dto.endTime);
    return this.prisma.workingHours.create({
      data: {
        tenantId,
        employeeId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async updateSchedule(
    tenantId: string,
    employeeId: string,
    workingHoursId: string,
    dto: UpdateEmployeeWorkingHoursDto,
  ): Promise<WorkingHours> {
    const current = await this.requireWorkingHours(tenantId, employeeId, workingHoursId);
    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;
    this.assertTimeOrder(startTime, endTime);
    return this.prisma.workingHours.update({
      where: { id: workingHoursId },
      data: {
        weekday: dto.weekday ?? current.weekday,
        startTime,
        endTime,
      },
    });
  }

  async removeSchedule(
    tenantId: string,
    employeeId: string,
    workingHoursId: string,
  ): Promise<void> {
    await this.requireWorkingHours(tenantId, employeeId, workingHoursId);
    await this.prisma.workingHours.delete({ where: { id: workingHoursId } });
  }

  // --- Time off --------------------------------------------------------------

  async listTimeOff(tenantId: string, employeeId: string): Promise<TimeOff[]> {
    await this.getEmployee(tenantId, employeeId);
    return this.prisma.timeOff.findMany({
      where: { tenantId, employeeId },
      orderBy: { startAt: 'desc' },
    });
  }

  async addTimeOff(
    tenantId: string,
    employeeId: string,
    dto: CreateEmployeeTimeOffDto,
  ): Promise<TimeOff> {
    await this.getEmployee(tenantId, employeeId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertDateOrder(startAt, endAt);
    return this.prisma.timeOff.create({
      data: {
        tenantId,
        employeeId,
        startAt,
        endAt,
        kind: dto.kind ?? 'VACATION',
        status: dto.status ?? 'PENDING',
      },
    });
  }

  async updateTimeOff(
    tenantId: string,
    employeeId: string,
    timeOffId: string,
    dto: UpdateEmployeeTimeOffDto,
  ): Promise<TimeOff> {
    const current = await this.requireTimeOff(tenantId, employeeId, timeOffId);
    const startAt = dto.startAt ? new Date(dto.startAt) : current.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : current.endAt;
    this.assertDateOrder(startAt, endAt);
    return this.prisma.timeOff.update({
      where: { id: timeOffId },
      data: {
        startAt,
        endAt,
        ...(dto.kind ? { kind: dto.kind } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async removeTimeOff(tenantId: string, employeeId: string, timeOffId: string): Promise<void> {
    await this.requireTimeOff(tenantId, employeeId, timeOffId);
    await this.prisma.timeOff.delete({ where: { id: timeOffId } });
  }

  // --- Commissions -----------------------------------------------------------

  /** Lists an employee's commissions, optionally filtered by period/status. */
  async listCommissions(
    tenantId: string,
    employeeId: string,
    period?: string,
    status?: CommissionStatus,
  ): Promise<Commission[]> {
    await this.getEmployee(tenantId, employeeId);
    const where: Prisma.CommissionWhereInput = { tenantId, employeeId };
    if (period) where.period = period;
    if (status) where.status = status;
    return this.prisma.commission.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  /**
   * (Re)calculates commissions for a period from the employee's COMPLETED
   * bookings: `amount = round(price * commissionRate / 10000)`. Idempotent —
   * bookings that already have a commission for this employee are skipped, so a
   * re-run only fills gaps. Requires the employee to have a `commissionRate`.
   *
   * TODO(integration): mover a evento (booking.completed) para materializar
   * comisiones de forma incremental en lugar de recalcular por periodo.
   */
  async calculateCommissions(
    tenantId: string,
    employeeId: string,
    period: string,
  ): Promise<CommissionCalculationResult> {
    const employee = await this.getEmployee(tenantId, employeeId);
    if (employee.commissionRate === null) {
      throw new BadRequestException('El profesional no tiene una tasa de comisión configurada');
    }
    const rate = employee.commissionRate;
    const { start, end } = this.periodRange(period);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        employeeId,
        status: BookingStatus.COMPLETED,
        startAt: { gte: start, lt: end },
      },
      select: { id: true, price: true, currency: true },
    });

    const existing = await this.prisma.commission.findMany({
      where: { tenantId, employeeId, period, bookingId: { not: null } },
      select: { bookingId: true },
    });
    const alreadyBilled = new Set<string>(
      existing
        .map((row) => row.bookingId)
        .filter((id): id is string => id !== null),
    );

    const created: Commission[] = [];
    let skipped = 0;
    let totalAmount = 0;
    for (const booking of bookings) {
      if (alreadyBilled.has(booking.id)) {
        skipped += 1;
        continue;
      }
      const amount = Math.round((booking.price * rate) / BASIS_POINTS);
      const commission = await this.prisma.commission.create({
        data: {
          tenantId,
          employeeId,
          bookingId: booking.id,
          amount,
          currency: booking.currency,
          period,
          status: 'PENDING',
        },
      });
      created.push(commission);
      totalAmount += amount;
    }

    return { period, created: created.length, skipped, totalAmount, commissions: created };
  }

  // --- Performance -----------------------------------------------------------

  /** Booking counts and COMPLETED revenue for an employee within a window. */
  async performance(
    tenantId: string,
    employeeId: string,
    from?: string,
    to?: string,
  ): Promise<EmployeePerformance> {
    const employee = await this.getEmployee(tenantId, employeeId);
    const { start, end } = this.performanceRange(from, to);

    const where: Prisma.BookingWhereInput = {
      tenantId,
      employeeId,
      startAt: { gte: start, lt: end },
    };

    const [grouped, revenue] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.booking.aggregate({
        where: { ...where, status: BookingStatus.COMPLETED },
        _sum: { price: true },
      }),
    ]);

    const counts = new Map<BookingStatus, number>();
    let total = 0;
    for (const row of grouped) {
      const count = row._count._all;
      counts.set(row.status, count);
      total += count;
    }

    return {
      employeeId: employee.id,
      from: start,
      to: end,
      totalBookings: total,
      completedBookings: counts.get(BookingStatus.COMPLETED) ?? 0,
      cancelledBookings: counts.get(BookingStatus.CANCELLED) ?? 0,
      noShowBookings: counts.get(BookingStatus.NO_SHOW) ?? 0,
      revenue: revenue._sum.price ?? 0,
      // Tenant default currency (bookings/services default to EUR in the schema).
      currency: 'EUR',
    };
  }

  // --- Helpers ---------------------------------------------------------------

  private async requireWorkingHours(
    tenantId: string,
    employeeId: string,
    id: string,
  ): Promise<WorkingHours> {
    const row = await this.prisma.workingHours.findFirst({
      where: { id, tenantId, employeeId },
    });
    if (!row) {
      throw new NotFoundException('Horario no encontrado');
    }
    return row;
  }

  private async requireTimeOff(
    tenantId: string,
    employeeId: string,
    id: string,
  ): Promise<TimeOff> {
    const row = await this.prisma.timeOff.findFirst({
      where: { id, tenantId, employeeId },
    });
    if (!row) {
      throw new NotFoundException('Permiso no encontrado');
    }
    return row;
  }

  /**
   * Ensures a linked user exists in the tenant and is not already tied to a
   * different employee (the User↔Employee link is 1:1 in practice).
   */
  private async assertUserAvailable(
    tenantId: string,
    userId: string,
    exceptEmployeeId?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('El usuario indicado no existe en este salón');
    }
    const taken = await this.prisma.employee.findFirst({
      where: { tenantId, userId, ...(exceptEmployeeId ? { id: { not: exceptEmployeeId } } : {}) },
      select: { id: true },
    });
    if (taken) {
      throw new BadRequestException('El usuario ya está vinculado a otro profesional');
    }
  }

  private resolveOrder(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
  ): Prisma.EmployeeOrderByWithRelationInput {
    const field = sortBy && EMPLOYEE_SORT_FIELDS.has(sortBy) ? sortBy : 'name';
    return { [field]: sortOrder };
  }

  /** UTC `[start, end)` bounds for a `YYYY-MM` period. */
  private periodRange(period: string): { start: Date; end: Date } {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
    if (!match) {
      throw new BadRequestException('period debe tener formato YYYY-MM');
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1; // 0-based
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));
    return { start, end };
  }

  /** Resolves the performance window, defaulting to the current UTC month. */
  private performanceRange(from?: string, to?: string): { start: Date; end: Date } {
    const now = new Date();
    const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const start = from ? new Date(from) : defaultStart;
    const end = to ? new Date(to) : defaultEnd;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }
    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException('from debe ser anterior a to');
    }
    return { start, end };
  }

  private assertTimeOrder(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime debe ser anterior a endTime');
    }
  }

  private assertDateOrder(startAt: Date, endAt: Date): void {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }
    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException('startAt debe ser anterior a endAt');
    }
  }
}
