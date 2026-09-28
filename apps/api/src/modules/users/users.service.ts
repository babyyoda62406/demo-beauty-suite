import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Role, type User, type UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateUserDto } from './dto/create-user.dto';
import { type InviteUserDto } from './dto/invite-user.dto';
import { ListUsersQueryDto, USER_SORT_FIELDS, type UserSortField } from './dto/list-users-query.dto';
import { type UpdateUserDto } from './dto/update-user.dto';

/** Public projection of a user, i.e. everything except `passwordHash`. */
export type PublicUser = Omit<User, 'passwordHash'>;

/**
 * Column selection that deliberately omits `passwordHash` so it can never leak
 * out of the service (SPEC §5).
 */
const USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  role: true,
  status: true,
  name: true,
  phone: true,
  photoUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/**
 * Staff account management for a tenant (SPEC §7 — `users`). Every operation is
 * scoped to the caller's `tenantId`: the `User` model is intentionally NOT in
 * the Prisma auto-scoping set (its `tenantId` is nullable for platform
 * `SUPERADMIN`s), so this service filters by `tenantId` explicitly on every
 * read and write to guarantee isolation between salons (SPEC §3).
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Creates a staff account within the tenant. */
  async create(tenantId: string, dto: CreateUserDto): Promise<PublicUser> {
    const email = this.normalizeEmail(dto.email);
    await this.assertEmailAvailable(tenantId, email);

    const passwordHash = await this.hashSecret(dto.password);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        name: dto.name.trim(),
        phone: dto.phone ?? null,
        role: dto.role ?? 'EMPLOYEE',
        status: dto.status ?? 'ACTIVE',
      },
      select: USER_SELECT,
    });

    this.logger.log(`Usuario creado ${user.id} en el tenant ${tenantId}`);
    return user;
  }

  /**
   * Invites a staff member: creates the account in `INVITED` status with a
   * random, unusable password. The invitee sets a real password via the reset
   * flow triggered from the invitation email.
   */
  async invite(tenantId: string, dto: InviteUserDto): Promise<PublicUser> {
    const email = this.normalizeEmail(dto.email);
    await this.assertEmailAvailable(tenantId, email);

    const passwordHash = await this.hashSecret(randomBytes(32).toString('hex'));
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        name: dto.name.trim(),
        role: dto.role ?? 'EMPLOYEE',
        status: 'INVITED',
      },
      select: USER_SELECT,
    });

    // TODO(integration): mover a evento y enviar email de invitación con enlace de alta.
    this.logger.log(`Usuario invitado ${user.id} en el tenant ${tenantId}`);
    return user;
  }

  /** Returns a paginated, optionally filtered/searched page of staff users. */
  async findAll(tenantId: string, query: ListUsersQueryDto): Promise<PaginatedResult<PublicUser>> {
    const where: Prisma.UserWhereInput = { tenantId };

    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [this.resolveSortField(query.sortBy)]: query.sortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy,
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  /** Fetches a single staff user, enforcing tenant ownership. */
  async findOne(tenantId: string, id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  /** Updates mutable profile fields (and optionally the role) of a user. */
  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<PublicUser> {
    await this.ensureExists(tenantId, id);

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);
      await this.assertEmailAvailable(tenantId, email, id);
      data.email = email;
    }
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }
    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    return this.applyScopedUpdate(tenantId, id, data);
  }

  /** Assigns a new role to the user (never `SUPERADMIN`, enforced by the DTO). */
  async assignRole(tenantId: string, id: string, role: Role): Promise<PublicUser> {
    await this.ensureExists(tenantId, id);
    return this.applyScopedUpdate(tenantId, id, { role });
  }

  /** Marks the user as `ACTIVE`. */
  async activate(tenantId: string, id: string): Promise<PublicUser> {
    return this.setStatus(tenantId, id, 'ACTIVE');
  }

  /** Marks the user as `SUSPENDED` and revokes their active sessions. */
  async deactivate(tenantId: string, id: string): Promise<PublicUser> {
    const user = await this.setStatus(tenantId, id, 'SUSPENDED');
    await this.revokeSessions(id);
    return user;
  }

  /**
   * Resets the user's password (argon2id) and revokes every active session so
   * the old credentials can no longer refresh (SPEC §4, §5).
   */
  async resetPassword(tenantId: string, id: string, password: string): Promise<PublicUser> {
    await this.ensureExists(tenantId, id);
    const passwordHash = await this.hashSecret(password);
    const user = await this.applyScopedUpdate(tenantId, id, { passwordHash });
    await this.revokeSessions(id);
    this.logger.log(`Contraseña restablecida para el usuario ${id}`);
    return user;
  }

  /** Permanently deletes a staff user (tenant-scoped). */
  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.prisma.user.deleteMany({ where: { id, tenantId } });
    if (result.count === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
    this.logger.log(`Usuario eliminado ${id} del tenant ${tenantId}`);
  }

  // --- helpers ---------------------------------------------------------------

  private async setStatus(tenantId: string, id: string, status: UserStatus): Promise<PublicUser> {
    await this.ensureExists(tenantId, id);
    return this.applyScopedUpdate(tenantId, id, { status });
  }

  /**
   * Applies an update filtered by `(id, tenantId)` via `updateMany` (which the
   * tenant predicate allows) and returns the fresh public projection. Callers
   * must have already verified existence for a correct 404 vs. no-op.
   */
  private async applyScopedUpdate(
    tenantId: string,
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<PublicUser> {
    await this.prisma.user.updateMany({ where: { id, tenantId }, data });
    return this.findOne(tenantId, id);
  }

  private async ensureExists(tenantId: string, id: string): Promise<void> {
    const exists = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  /** Throws `ConflictException` if `email` is taken by another user in the tenant. */
  private async assertEmailAvailable(
    tenantId: string,
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: {
        email,
        tenantId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese correo en el salón');
    }
  }

  private async revokeSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private resolveSortField(sortBy: string | undefined): UserSortField {
    if (sortBy && (USER_SORT_FIELDS as readonly string[]).includes(sortBy)) {
      return sortBy as UserSortField;
    }
    if (sortBy) {
      throw new BadRequestException(`No se puede ordenar por el campo "${sortBy}"`);
    }
    return 'createdAt';
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private hashSecret(secret: string): Promise<string> {
    return argon2.hash(secret, { type: argon2.argon2id });
  }
}
