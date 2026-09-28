import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Client, type ClientPhoto, type Prisma } from '@prisma/client';

import {
  buildPaginatedResult,
  type PaginatedResult,
  type PaginationDto,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateClientDto } from './dto/create-client.dto';
import { type CreateClientPhotoDto } from './dto/create-client-photo.dto';
import { type UpdateClientDto } from './dto/update-client.dto';
import { type UpdateNotesDto } from './dto/update-notes.dto';

/** Whitelisted, safe columns for client ordering (avoids injection via sortBy). */
const CLIENT_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'name',
  'loyaltyPoints',
  'birthDate',
  'createdAt',
  'updatedAt',
]);

/** How many recent photos to embed in a client's file. */
const PHOTOS_LIMIT = 24;
/** How many recent bookings/payments to embed as history in a client's file. */
const HISTORY_LIMIT = 10;

/** A client record with its embedded history (photos, bookings, payments). */
export type ClientWithHistory = Prisma.ClientGetPayload<{
  include: {
    photos: true;
    bookings: { include: { service: true; employee: true } };
    payments: true;
  };
}>;

/** A client with a computed upcoming birthday within the requested window. */
export interface UpcomingBirthday {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  birthDate: Date;
  nextBirthday: Date;
  daysUntil: number;
  turningAge: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * CRM domain service for clients (clientas): full file management with photos,
 * private notes, loyalty points (read-only here) and history. Every query is
 * strictly tenant-scoped (SPEC §3/§6): reads filter by the resolved `tenantId`
 * on top of the Prisma tenant middleware as defence-in-depth, and single-row
 * updates/deletes verify ownership first (the middleware cannot scope
 * unique-`where` writes — see `PrismaService`).
 */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ficha de la clienta que ha iniciado sesión, para su portal.
   *
   * La ficha se crea al registrarse (ver `AuthService.linkOrCreateClientRecord`),
   * pero las cuentas anteriores a eso se quedaron sin ella: en ese caso se crea
   * al vuelo con los datos de la cuenta, en vez de dejar el portal inservible.
   */
  async findMine(tenantId: string, userId: string): Promise<Client> {
    const existente = await this.prisma.client.findFirst({ where: { tenantId, userId } });
    if (existente) return existente;

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });
    if (!user) {
      throw new NotFoundException('No hay una ficha de clienta asociada a tu cuenta');
    }

    const previa = await this.prisma.client.findFirst({
      where: {
        tenantId,
        userId: null,
        OR: [
          ...(user.email ? [{ email: user.email }] : []),
          ...(user.phone ? [{ phone: user.phone }] : []),
        ],
      },
      select: { id: true },
    });
    if (previa) {
      return this.prisma.client.update({ where: { id: previa.id }, data: { userId } });
    }

    return this.prisma.client.create({
      data: {
        tenantId,
        userId,
        name: user.name,
        phone: user.phone ?? '',
        email: user.email,
      },
    });
  }

  /**
   * La clienta edita sus propios datos de contacto y preferencias.
   *
   * Deliberadamente NO puede tocar lo que gestiona el salón (notas internas,
   * puntos de fidelización o a qué cuenta está vinculada su ficha).
   */
  async updateMine(tenantId: string, userId: string, dto: UpdateClientDto): Promise<Client> {
    const mia = await this.findMine(tenantId, userId);
    const data: Prisma.ClientUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim().toLowerCase() ?? null;
    if (dto.instagram !== undefined) data.instagram = dto.instagram?.trim() ?? null;
    if (dto.birthDate !== undefined) data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl ?? null;
    if (dto.allergies !== undefined) data.allergies = dto.allergies ?? null;
    if (dto.preferences !== undefined) data.preferences = dto.preferences ?? null;
    if (dto.favoriteColors !== undefined) data.favoriteColors = dto.favoriteColors ?? null;

    return this.prisma.client.update({ where: { id: mia.id }, data });
  }

  async create(tenantId: string, dto: CreateClientDto): Promise<Client> {
    return this.prisma.client.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim().toLowerCase() ?? null,
        instagram: dto.instagram?.trim() ?? null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        photoUrl: dto.photoUrl ?? null,
        allergies: dto.allergies ?? null,
        preferences: dto.preferences ?? null,
        favoriteColors: dto.favoriteColors ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  /** Paginated listing with free-text search by name, phone or email. */
  async list(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Client>> {
    const where: Prisma.ClientWhereInput = { tenantId };
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.resolveOrder(query.sortBy, query.sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.client.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /** Returns a single client (used by update/delete/notes to assert ownership). */
  async getClient(tenantId: string, id: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId } });
    if (!client) {
      throw new NotFoundException('Clienta no encontrada');
    }
    return client;
  }

  /**
   * Full client file including recent photos and history (latest bookings and
   * payments) via Prisma `include`. History rows belong to the client and are
   * therefore already tenant-isolated through the parent relation (SPEC §7).
   */
  async findOne(tenantId: string, id: string): Promise<ClientWithHistory> {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        photos: { orderBy: { createdAt: 'desc' }, take: PHOTOS_LIMIT },
        bookings: {
          orderBy: { startAt: 'desc' },
          take: HISTORY_LIMIT,
          include: { service: true, employee: true },
        },
        payments: { orderBy: { createdAt: 'desc' }, take: HISTORY_LIMIT },
      },
    });
    if (!client) {
      throw new NotFoundException('Clienta no encontrada');
    }
    return client;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto): Promise<Client> {
    await this.getClient(tenantId, id);

    const data: Prisma.ClientUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim().toLowerCase() ?? null;
    if (dto.instagram !== undefined) data.instagram = dto.instagram?.trim() ?? null;
    if (dto.birthDate !== undefined) data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl ?? null;
    if (dto.allergies !== undefined) data.allergies = dto.allergies ?? null;
    if (dto.preferences !== undefined) data.preferences = dto.preferences ?? null;
    if (dto.favoriteColors !== undefined) data.favoriteColors = dto.favoriteColors ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;

    return this.prisma.client.update({ where: { id }, data });
  }

  /** Sets or clears the private salon notes of a client. */
  async updateNotes(tenantId: string, id: string, dto: UpdateNotesDto): Promise<Client> {
    await this.getClient(tenantId, id);
    return this.prisma.client.update({
      where: { id },
      data: { notes: dto.notes ?? null },
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.getClient(tenantId, id);
    await this.prisma.client.delete({ where: { id } });
  }

  /**
   * Attaches a before/after/design photo to a client's file. When a booking is
   * referenced it must belong to the same client and tenant.
   */
  async addPhoto(
    tenantId: string,
    clientId: string,
    dto: CreateClientPhotoDto,
  ): Promise<ClientPhoto> {
    await this.getClient(tenantId, clientId);

    const bookingId = dto.bookingId ?? null;
    if (bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, tenantId, clientId },
        select: { id: true },
      });
      if (!booking) {
        throw new BadRequestException('La cita indicada no existe para esta clienta');
      }
    }

    // ClientPhoto is isolated through its parent client (not directly
    // tenant-scoped); ownership was asserted above via `getClient`.
    return this.prisma.clientPhoto.create({
      data: {
        clientId,
        url: dto.url,
        kind: dto.kind ?? 'DESIGN',
        bookingId,
      },
    });
  }

  /**
   * Clients whose birthday falls within the next `days` (inclusive), sorted by
   * proximity. Birthdays are matched by month/day (ignoring birth year) in UTC.
   *
   * TODO(integration): for large tenants move this to a database-side query
   * (raw SQL on month/day) instead of loading all dated clients into memory.
   */
  async upcomingBirthdays(tenantId: string, days: number): Promise<UpcomingBirthday[]> {
    const clients = await this.prisma.client.findMany({
      where: { tenantId, birthDate: { not: null } },
      select: { id: true, name: true, phone: true, email: true, photoUrl: true, birthDate: true },
    });

    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const currentYear = now.getUTCFullYear();

    const upcoming: UpcomingBirthday[] = [];
    for (const client of clients) {
      const birthDate = client.birthDate;
      if (!birthDate) {
        continue;
      }

      const month = birthDate.getUTCMonth();
      const day = birthDate.getUTCDate();
      let nextMs = Date.UTC(currentYear, month, day);
      if (nextMs < todayUtc) {
        nextMs = Date.UTC(currentYear + 1, month, day);
      }

      const daysUntil = Math.round((nextMs - todayUtc) / MS_PER_DAY);
      if (daysUntil > days) {
        continue;
      }

      const nextBirthday = new Date(nextMs);
      upcoming.push({
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        photoUrl: client.photoUrl,
        birthDate,
        nextBirthday,
        daysUntil,
        turningAge: nextBirthday.getUTCFullYear() - birthDate.getUTCFullYear(),
      });
    }

    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    return upcoming;
  }

  // --- helpers ---------------------------------------------------------------

  private resolveOrder(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
  ): Prisma.ClientOrderByWithRelationInput {
    const field = sortBy && CLIENT_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';
    return { [field]: sortOrder };
  }
}
