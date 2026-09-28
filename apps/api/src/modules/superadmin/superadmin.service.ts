import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ModuleActivation,
  Prisma,
  Role,
  SubscriptionStatus,
  SupportTicket,
  TenantStatus,
  TicketStatus,
} from '@prisma/client';

import { type AppConfig } from '../../config/configuration';
import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { type AccessTokenPayload } from '../../auth/auth.types';

import { type CreateTicketDto } from './dto/create-ticket.dto';
import { type ListTenantsDto } from './dto/list-tenants.dto';
import { type ListTicketsDto } from './dto/list-tickets.dto';
import { type ModuleActivationDto } from './dto/module-activation.dto';
import { type UpdateTicketDto } from './dto/update-ticket.dto';

/** A salon row enriched with lightweight platform metrics. */
export interface TenantMetrics {
  id: string;
  slug: string;
  name: string;
  planKey: string;
  status: TenantStatus;
  currency: string;
  createdAt: Date;
  metrics: {
    users: number;
    clients: number;
    bookings: number;
    activeSubscriptions: number;
  };
}

/** Aggregated, platform-wide KPIs for the SUPERADMIN dashboard. */
export interface GlobalStats {
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  bookingsTotal: number;
  clientsTotal: number;
  openTickets: number;
  /** Approximate monthly recurring revenue, in cents, over active subscriptions. */
  mrrCents: number;
  currency: string;
}

/** Short-lived support token bounded to a single tenant (SPEC §4, §5). */
export interface ImpersonationToken {
  accessToken: string;
  expiresIn: number;
  tenantId: string;
  role: Role;
}

/** The actor performing a platform action (for audit trails). */
export interface AdminActor {
  userId: string;
  email: string;
}

/**
 * Super Admin (platform) domain service (SPEC §3, §6, §7).
 *
 * These operations run under a SUPERADMIN context, for which the Prisma
 * tenant-scoping middleware bypasses isolation — every read spans all salons,
 * and every write to a tenant-scoped model MUST pass `tenantId` explicitly.
 * `Tenant`, `SupportTicket`, `ModuleActivation`, `Subscription` and `AuditLog`
 * are therefore addressed by explicit id/tenant here. Sensitive actions
 * (impersonation) are recorded in `AuditLog`.
 */
@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  // --- Salons with metrics ---------------------------------------------------

  /** Paginated listing of every salon with lightweight usage metrics. */
  async listTenants(query: ListTenantsDto): Promise<PaginatedResult<TenantMetrics>> {
    const where: Prisma.TenantWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.planKey) {
      where.planKey = query.planKey;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { legalName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
        skip: query.skip,
        take: query.take,
        include: {
          _count: { select: { users: true, clients: true, bookings: true } },
          subscriptions: { where: { status: SubscriptionStatus.ACTIVE }, select: { id: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const data: TenantMetrics[] = rows.map((tenant) => ({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      planKey: tenant.planKey,
      status: tenant.status,
      currency: tenant.currency,
      createdAt: tenant.createdAt,
      metrics: {
        users: tenant._count.users,
        clients: tenant._count.clients,
        bookings: tenant._count.bookings,
        activeSubscriptions: tenant.subscriptions.length,
      },
    }));

    return buildPaginatedResult(data, total, query);
  }

  // --- Global stats ----------------------------------------------------------

  /** Aggregated platform KPIs: salon counts, totals and approximate MRR. */
  async getGlobalStats(): Promise<GlobalStats> {
    const [total, active, trial, suspended, bookingsTotal, clientsTotal, openTickets, activeSubs] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
        this.prisma.tenant.count({ where: { status: TenantStatus.TRIAL } }),
        this.prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
        this.prisma.booking.count(),
        this.prisma.client.count(),
        this.prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
        this.prisma.subscription.findMany({
          where: { status: SubscriptionStatus.ACTIVE },
          select: { plan: { select: { priceMonthly: true } } },
        }),
      ]);

    const mrrCents = activeSubs.reduce((sum, sub) => sum + sub.plan.priceMonthly, 0);

    return {
      tenants: { total, active, trial, suspended },
      bookingsTotal,
      clientsTotal,
      openTickets,
      mrrCents,
      currency: 'EUR',
    };
  }

  // --- Impersonation ---------------------------------------------------------

  /**
   * Issues a short-lived access token bounded to a single tenant so platform
   * support can act inside a salon (role `OWNER`, never SUPERADMIN, so the
   * Prisma middleware keeps the session scoped to that tenant). The action is
   * recorded in `AuditLog`.
   */
  async impersonate(tenantId: string, actor: AdminActor): Promise<ImpersonationToken> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException('Salón no encontrado');
    }

    const jwtConfig = this.config.get('jwt', { infer: true });
    const role: Role = Role.OWNER;
    const payload: AccessTokenPayload = {
      sub: actor.userId,
      email: actor.email,
      tenantId,
      role,
      type: 'access',
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessTtl,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorId: actor.userId,
        action: 'IMPERSONATE',
        entity: 'Tenant',
        entityId: tenantId,
        meta: { impersonatorEmail: actor.email, role },
      },
    });
    this.logger.warn(`SUPERADMIN ${actor.userId} impersona el salón ${tenantId}`);

    return { accessToken, expiresIn: jwtConfig.accessTtl, tenantId, role };
  }

  // --- Support tickets (CRUD) ------------------------------------------------

  /** Paginated listing of support tickets across all (or one) salon. */
  async listTickets(query: ListTicketsDto): Promise<PaginatedResult<SupportTicket>> {
    const where: Prisma.SupportTicketWhereInput = {};
    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  /** Fetches a single support ticket by id or throws `NotFoundException`. */
  async getTicket(id: string): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Incidencia no encontrada');
    }
    return ticket;
  }

  /** Opens a ticket for a salon on behalf of platform support. */
  async createTicket(dto: CreateTicketDto, actor: AdminActor): Promise<SupportTicket> {
    await this.assertTenantExists(dto.tenantId);

    const data: Prisma.SupportTicketUncheckedCreateInput = {
      tenantId: dto.tenantId,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      createdById: actor.userId,
    };
    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }

    return this.prisma.supportTicket.create({ data });
  }

  /** Updates a ticket's workflow fields (status/priority/text). */
  async updateTicket(id: string, dto: UpdateTicketDto): Promise<SupportTicket> {
    await this.getTicket(id);

    const data: Prisma.SupportTicketUncheckedUpdateInput = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }
    if (dto.subject !== undefined) {
      data.subject = dto.subject.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim();
    }

    return this.prisma.supportTicket.update({ where: { id }, data });
  }

  /** Deletes a support ticket. */
  async removeTicket(id: string): Promise<void> {
    await this.getTicket(id);
    await this.prisma.supportTicket.delete({ where: { id } });
  }

  // --- Module activation per tenant ------------------------------------------

  /** Lists the module activations of a salon. */
  async listModules(tenantId: string): Promise<ModuleActivation[]> {
    await this.assertTenantExists(tenantId);
    return this.prisma.moduleActivation.findMany({
      where: { tenantId },
      orderBy: { moduleKey: 'asc' },
    });
  }

  /** Activates/deactivates a module for a salon (upsert by tenant+module). */
  async setModule(tenantId: string, dto: ModuleActivationDto): Promise<ModuleActivation> {
    await this.assertTenantExists(tenantId);
    const enabled = dto.enabled ?? true;

    return this.prisma.moduleActivation.upsert({
      where: { tenantId_moduleKey: { tenantId, moduleKey: dto.moduleKey } },
      create: { tenantId, moduleKey: dto.moduleKey, enabled },
      update: { enabled },
    });
  }

  // --- helpers ---------------------------------------------------------------

  private async assertTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException('Salón no encontrado');
    }
  }
}
