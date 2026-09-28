import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Booking,
  type BookingStatus,
  type Client,
  Prisma,
  type WaitlistEntry,
} from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { getCurrentTenantId } from '../../tenancy/tenant-context';

import { type AvailabilityQueryDto, type AvailabilityResponseDto } from './dto/availability-query.dto';
import { type CancelBookingDto } from './dto/cancel-booking.dto';
import { type CreateManualBookingDto } from './dto/create-manual-booking.dto';
import { type CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { type CreateWaitlistDto } from './dto/create-waitlist.dto';
import { type QueryBookingsDto } from './dto/query-bookings.dto';
import { type QueryWaitlistDto } from './dto/query-waitlist.dto';
import { type RescheduleBookingDto } from './dto/reschedule-booking.dto';

/** Granularity (minutes) at which candidate slots are generated. */
const SLOT_STEP_MIN = 15;

/** Booking statuses that free up a time window (do not block availability). */
const FREEING_STATUSES: readonly BookingStatus[] = ['CANCELLED', 'NO_SHOW'];

/** Minute in milliseconds. */
const MINUTE_MS = 60_000;

/** Rich booking projection returned by the admin agenda. */
const BOOKING_INCLUDE = {
  client: { select: { id: true, name: true, phone: true, email: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true, currency: true } },
  employee: { select: { id: true, name: true, color: true } },
} satisfies Prisma.BookingInclude;

/**
 * Agenda / bookings domain service (SPEC §6, §7).
 *
 * Implements real availability computation (working hours ∩ ¬time-off ∩
 * ¬existing-bookings, sliced by service duration), public/staff booking
 * creation with client association, the admin agenda listing, the booking
 * state machine, and loyalty accrual on completion. All queries are
 * tenant-scoped by the Prisma middleware; single-row `update`s always resolve
 * the row within the tenant first (see PrismaService docblock).
 *
 * NOTE(timezone): working hours and the availability `date` are interpreted in
 * UTC for deterministic slot math. // TODO(integration): aplicar Tenant.timezone.
 */
@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  /**
   * Computes free slots for a service on a given day. When `employeeId` is
   * omitted, slots from every bookable professional are aggregated and each
   * slot lists the professionals available for it.
   */
  async getAvailability(query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    const service = await this.prisma.service.findFirst({
      where: { id: query.serviceId, active: true },
      select: { id: true, durationMin: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const [year, month, day] = query.date.split('-').map(Number) as [number, number, number];
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const now = new Date();
    const durationMs = service.durationMin * MINUTE_MS;

    const employees = query.employeeId
      ? await this.requireBookableEmployee(query.employeeId).then((e) => [e])
      : await this.prisma.employee.findMany({
          where: { active: true, bookable: true },
          select: { id: true },
        });

    const slotMap = new Map<string, { startAt: Date; endAt: Date; employeeIds: string[] }>();

    for (const employee of employees) {
      const windows = await this.resolveWorkingWindows(employee.id, weekday, query.date);
      if (windows.length === 0) {
        continue;
      }
      const busy = await this.busyIntervals(employee.id, dayStart, dayEnd);

      for (const window of windows) {
        for (
          let cursor = window.start.getTime();
          cursor + durationMs <= window.end.getTime();
          cursor += SLOT_STEP_MIN * MINUTE_MS
        ) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(cursor + durationMs);
          if (slotStart <= now) {
            continue;
          }
          if (busy.some((b) => this.overlaps(b.start, b.end, slotStart, slotEnd))) {
            continue;
          }
          const key = slotStart.toISOString();
          const existing = slotMap.get(key);
          if (existing) {
            if (!existing.employeeIds.includes(employee.id)) {
              existing.employeeIds.push(employee.id);
            }
          } else {
            slotMap.set(key, { startAt: slotStart, endAt: slotEnd, employeeIds: [employee.id] });
          }
        }
      }
    }

    const slots = [...slotMap.values()]
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map((s) => ({
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        employeeIds: s.employeeIds,
      }));

    return { serviceId: service.id, date: query.date, durationMin: service.durationMin, slots };
  }

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------

  /** Public self-booking: associates the client by phone, creates a PENDING/PUBLIC booking. */
  async createPublicBooking(dto: CreatePublicBookingDto): Promise<Booking> {
    const service = await this.requireActiveService(dto.serviceId);
    const startAt = this.parseFutureDate(dto.startAt);
    const endAt = new Date(startAt.getTime() + service.durationMin * MINUTE_MS);

    if (dto.employeeId) {
      await this.requireBookableEmployee(dto.employeeId);
      await this.assertEmployeeFree(dto.employeeId, startAt, endAt);
    }

    const client = await this.associateClientByPhone(dto.name, dto.phone, dto.email);

    return this.prisma.booking.create({
      data: {
        tenantId: this.tenantId(),
        clientId: client.id,
        serviceId: service.id,
        employeeId: dto.employeeId ?? null,
        startAt,
        endAt,
        status: 'PENDING',
        source: 'PUBLIC',
        price: service.price,
        currency: service.currency,
        notes: dto.notes ?? null,
      },
    });
  }

  /** Staff-created booking for an existing client (CONFIRMED / ADMIN). */
  async createManualBooking(dto: CreateManualBookingDto): Promise<Booking> {
    const service = await this.requireActiveService(dto.serviceId);
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Clienta no encontrada');
    }
    const startAt = this.parseFutureDate(dto.startAt);
    const endAt = new Date(startAt.getTime() + service.durationMin * MINUTE_MS);

    if (dto.employeeId) {
      await this.requireBookableEmployee(dto.employeeId);
      await this.assertEmployeeFree(dto.employeeId, startAt, endAt);
    }

    return this.prisma.booking.create({
      data: {
        tenantId: this.tenantId(),
        clientId: client.id,
        serviceId: service.id,
        employeeId: dto.employeeId ?? null,
        startAt,
        endAt,
        status: 'CONFIRMED',
        source: 'ADMIN',
        price: service.price,
        currency: service.currency,
        notes: dto.notes ?? null,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Agenda listing
  // ---------------------------------------------------------------------------

  /**
   * Citas de la clienta autenticada, para su portal.
   *
   * Se filtra por su ficha, nunca por un identificador que venga del cliente:
   * así una clienta no puede leer la agenda de otra cambiando la petición.
   */
  async listMine(userId: string, query: QueryBookingsDto): Promise<PaginatedResult<Booking>> {
    const tenantId = getCurrentTenantId();
    const client = await this.prisma.client.findFirst({
      where: { ...(tenantId ? { tenantId } : {}), userId },
      select: { id: true },
    });
    if (!client) {
      // Sin ficha no hay citas que enseñar, pero tampoco es un error: el portal
      // muestra su estado vacío en vez de una pantalla rota.
      return buildPaginatedResult([], 0, query);
    }

    const where: Prisma.BookingWhereInput = { clientId: client.id };
    if (query.from || query.to) {
      where.startAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { startAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /**
   * Comprueba que una cita es de la clienta indicada.
   *
   * La usa el portal antes de cancelar o reprogramar: sin esto, conocer un
   * identificador ajeno bastaría para tocar la cita de otra persona.
   */
  async assertOwnedByUser(bookingId: string, userId: string): Promise<void> {
    const tenantId = getCurrentTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId },
      select: { client: { select: { userId: true, tenantId: true } } },
    });
    const owner = booking?.client;
    if (!owner || owner.userId !== userId || (tenantId && owner.tenantId !== tenantId)) {
      throw new NotFoundException('Cita no encontrada');
    }
  }

  /** Admin agenda listing for day/week/month views (SPEC §7). */
  async list(query: QueryBookingsDto): Promise<PaginatedResult<Booking>> {
    const where: Prisma.BookingWhereInput = {};
    if (query.from || query.to) {
      where.startAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { startAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  /** Single booking with its related client/service/employee. */
  async findOne(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return booking;
  }

  // ---------------------------------------------------------------------------
  // State machine
  // ---------------------------------------------------------------------------

  /** PENDING → CONFIRMED. */
  async confirm(id: string): Promise<Booking> {
    const booking = await this.requireBooking(id);
    this.ensureStatus(booking.status, ['PENDING'], 'confirmar');
    return this.prisma.booking.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  /** PENDING | CONFIRMED → CANCELLED (optionally recording a reason). */
  async cancel(id: string, dto: CancelBookingDto): Promise<Booking> {
    const booking = await this.requireBooking(id);
    this.ensureStatus(booking.status, ['PENDING', 'CONFIRMED'], 'cancelar');
    const notes = dto.reason
      ? [booking.notes, `Cancelada: ${dto.reason}`].filter(Boolean).join(' | ')
      : booking.notes;
    return this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED', notes } });
  }

  /** PENDING | CONFIRMED → NO_SHOW. */
  async noShow(id: string): Promise<Booking> {
    const booking = await this.requireBooking(id);
    this.ensureStatus(booking.status, ['PENDING', 'CONFIRMED'], 'marcar como no asistida');
    return this.prisma.booking.update({ where: { id }, data: { status: 'NO_SHOW' } });
  }

  /** Moves a PENDING | CONFIRMED booking to a new time/professional (status preserved). */
  async reschedule(id: string, dto: RescheduleBookingDto): Promise<Booking> {
    const booking = await this.requireBooking(id);
    this.ensureStatus(booking.status, ['PENDING', 'CONFIRMED'], 'reprogramar');

    const service = await this.prisma.service.findFirst({
      where: { id: booking.serviceId },
      select: { durationMin: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const startAt = this.parseFutureDate(dto.startAt);
    const endAt = new Date(startAt.getTime() + service.durationMin * MINUTE_MS);
    const employeeId = dto.employeeId ?? booking.employeeId;

    if (dto.employeeId) {
      await this.requireBookableEmployee(dto.employeeId);
    }
    if (employeeId) {
      await this.assertEmployeeFree(employeeId, startAt, endAt, booking.id);
    }

    return this.prisma.booking.update({ where: { id }, data: { startAt, endAt, employeeId } });
  }

  /**
   * PENDING | CONFIRMED → COMPLETED. Atomically records a loyalty stamp for the
   * client (every 10th stamp grants a free service).
   */
  async complete(id: string): Promise<Booking> {
    const booking = await this.requireBooking(id);
    this.ensureStatus(booking.status, ['PENDING', 'CONFIRMED'], 'completar');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({ where: { id }, data: { status: 'COMPLETED' } });
      await this.accrueLoyaltyStamp(tx, booking.tenantId, booking.clientId, booking.id);
      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Waitlist
  // ---------------------------------------------------------------------------

  /** Adds a client (associated by phone) to the waitlist for a service. */
  async addToWaitlist(dto: CreateWaitlistDto): Promise<WaitlistEntry> {
    await this.requireActiveService(dto.serviceId);
    const client = await this.associateClientByPhone(dto.name, dto.phone, dto.email);
    return this.prisma.waitlistEntry.create({
      data: {
        tenantId: this.tenantId(),
        clientId: client.id,
        serviceId: dto.serviceId,
        desiredDate: new Date(dto.desiredDate),
        status: 'WAITING',
      },
    });
  }

  /** Lists waitlist entries (optionally by status), most recent desired date first. */
  async listWaitlist(query: QueryWaitlistDto): Promise<PaginatedResult<WaitlistEntry>> {
    const where: Prisma.WaitlistEntryWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    const [data, total] = await Promise.all([
      this.prisma.waitlistEntry.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true } },
        },
        orderBy: { desiredDate: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.waitlistEntry.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Records a single loyalty stamp within the given transaction. Creates the
   * card on first stamp; grants a free service every 10 stamps.
   * // TODO(integration): mover a evento (bookings→loyalty).
   */
  private async accrueLoyaltyStamp(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
    bookingId: string,
  ): Promise<void> {
    const card = await tx.loyaltyCard.findFirst({ where: { clientId } });
    if (!card) {
      const created = await tx.loyaltyCard.create({
        data: { tenantId, clientId, stamps: 1, freeEarned: 0 },
      });
      await tx.loyaltyTransaction.create({
        data: { cardId: created.id, bookingId, delta: 1, reason: 'Sello por servicio completado' },
      });
      return;
    }

    const newStamps = card.stamps + 1;
    const freeIncrement = newStamps % 10 === 0 ? 1 : 0;
    await tx.loyaltyCard.update({
      where: { id: card.id },
      data: { stamps: newStamps, freeEarned: card.freeEarned + freeIncrement },
    });
    await tx.loyaltyTransaction.create({
      data: { cardId: card.id, bookingId, delta: 1, reason: 'Sello por servicio completado' },
    });
  }

  /** Working windows for an employee on a weekday; falls back to salon-wide hours. */
  private async resolveWorkingWindows(
    employeeId: string,
    weekday: number,
    date: string,
  ): Promise<{ start: Date; end: Date }[]> {
    let rows = await this.prisma.workingHours.findMany({
      where: { weekday, employeeId },
      select: { startTime: true, endTime: true },
    });
    if (rows.length === 0) {
      rows = await this.prisma.workingHours.findMany({
        where: { weekday, employeeId: null },
        select: { startTime: true, endTime: true },
      });
    }
    return rows
      .map((r) => ({ start: this.atTime(date, r.startTime), end: this.atTime(date, r.endTime) }))
      .filter((w) => w.end.getTime() > w.start.getTime());
  }

  /** Bookings + approved time-off overlapping the day, as busy intervals. */
  private async busyIntervals(
    employeeId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<{ start: Date; end: Date }[]> {
    const [bookings, timeOffs] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          employeeId,
          status: { notIn: [...FREEING_STATUSES] },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.timeOff.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);
    return [
      ...bookings.map((b) => ({ start: b.startAt, end: b.endAt })),
      ...timeOffs.map((t) => ({ start: t.startAt, end: t.endAt })),
    ];
  }

  /** Throws `ConflictException` if the employee has a booking/time-off collision. */
  private async assertEmployeeFree(
    employeeId: string,
    start: Date,
    end: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    const bookingWhere: Prisma.BookingWhereInput = {
      employeeId,
      status: { notIn: [...FREEING_STATUSES] },
      startAt: { lt: end },
      endAt: { gt: start },
    };
    if (excludeBookingId) {
      bookingWhere.id = { not: excludeBookingId };
    }
    const clash = await this.prisma.booking.findFirst({ where: bookingWhere, select: { id: true } });
    if (clash) {
      throw new ConflictException('El horario seleccionado ya no está disponible');
    }
    const off = await this.prisma.timeOff.findFirst({
      where: { employeeId, status: 'APPROVED', startAt: { lt: end }, endAt: { gt: start } },
      select: { id: true },
    });
    if (off) {
      throw new ConflictException('El profesional no está disponible en ese horario');
    }
  }

  /** Finds an active client by phone within the tenant, or creates one. */
  private async associateClientByPhone(
    name: string,
    phone: string,
    email?: string,
  ): Promise<Client> {
    const existing = await this.prisma.client.findFirst({ where: { phone } });
    if (existing) {
      if (email && !existing.email) {
        return this.prisma.client.update({ where: { id: existing.id }, data: { email } });
      }
      return existing;
    }
    return this.prisma.client.create({
      data: { tenantId: this.tenantId(), name, phone, email: email ?? null },
    });
  }

  /** Current tenant id from the request context (throws if unresolved). */
  private tenantId(): string {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }

  private async requireActiveService(
    serviceId: string,
  ): Promise<{ id: string; durationMin: number; price: number; currency: string }> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, active: true },
      select: { id: true, durationMin: true, price: true, currency: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return service;
  }

  private async requireBookableEmployee(employeeId: string): Promise<{ id: string }> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, active: true, bookable: true },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Profesional no disponible');
    }
    return employee;
  }

  /** Loads a booking within the tenant (via the scoped findUnique rewrite). */
  private async requireBooking(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return booking;
  }

  private ensureStatus(
    current: BookingStatus,
    allowed: readonly BookingStatus[],
    action: string,
  ): void {
    if (!allowed.includes(current)) {
      throw new ConflictException(
        `No se puede ${action} una reserva en estado ${current}`,
      );
    }
  }

  private parseFutureDate(iso: string): Date {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('La cita debe programarse en el futuro');
    }
    return date;
  }

  /** Builds a UTC `Date` from a `YYYY-MM-DD` day and an `HH:mm` time. */
  private atTime(date: string, time: string): Date {
    const [year, month, day] = date.split('-').map(Number) as [number, number, number];
    const [hour, minute] = time.split(':').map(Number) as [number, number];
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
  }
}
