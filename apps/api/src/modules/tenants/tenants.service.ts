import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleActivation, Prisma, Setting, Tenant } from '@prisma/client';

import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type BrandDto } from './dto/brand.dto';
import { type BrandingResponseDto } from './dto/branding-response.dto';
import { type CreateTenantDto } from './dto/create-tenant.dto';
import { type ListTenantsDto } from './dto/list-tenants.dto';
import { type ModuleActivationDto } from './dto/module-activation.dto';
import { type UpdateTenantDto } from './dto/update-tenant.dto';
import { type UpsertSettingDto } from './dto/upsert-setting.dto';

/**
 * Tenants/salons domain service (SPEC §3, §6, §7).
 *
 * `Tenant` is the platform root and is NOT tenant-scoped by the Prisma
 * middleware, so SUPERADMIN operations address tenants by id directly. OWNER
 * operations are constrained to the caller's own `tenantId` (resolved from the
 * authenticated user in the controller) and never receive an arbitrary id.
 * `ModuleActivation`/`Setting` are tenant-scoped models: for SUPERADMIN the
 * middleware bypasses scoping, so `tenantId` is always passed explicitly here.
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- SUPERADMIN: tenant CRUD ----------------------------------------------

  /** Creates a salon, enforcing a unique slug (and domain when provided). */
  async create(dto: CreateTenantDto): Promise<Tenant> {
    const slug = dto.slug.toLowerCase().trim();
    await this.assertSlugAvailable(slug);
    if (dto.domain) {
      await this.assertDomainAvailable(dto.domain);
    }

    const data: Prisma.TenantUncheckedCreateInput = {
      slug,
      name: dto.name.trim(),
      legalName: dto.legalName ?? null,
      domain: dto.domain ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
    };
    if (dto.planKey !== undefined) data.planKey = dto.planKey;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.locale !== undefined) data.locale = dto.locale;
    if (dto.currency !== undefined) data.currency = dto.currency;
    const brandJson = this.toBrandJson(dto.brand);
    if (brandJson !== undefined) data.brand = brandJson;

    const tenant = await this.prisma.tenant.create({ data });

    this.logger.log(`Salón creado: ${tenant.id} (${tenant.slug})`);
    return tenant;
  }

  /** Paginated tenant listing with optional status/plan filters and search. */
  async list(query: ListTenantsDto): Promise<PaginatedResult<Tenant>> {
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

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  /** Fetches a tenant by id or throws `NotFoundException`. */
  async findById(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Salón no encontrado');
    }
    return tenant;
  }

  /** Updates a tenant's core attributes (SUPERADMIN). */
  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const current = await this.findById(id);

    const data: Prisma.TenantUncheckedUpdateInput = {};
    if (dto.slug !== undefined) {
      const slug = dto.slug.toLowerCase().trim();
      if (slug !== current.slug) {
        await this.assertSlugAvailable(slug);
      }
      data.slug = slug;
    }
    if (dto.domain !== undefined) {
      if (dto.domain && dto.domain !== current.domain) {
        await this.assertDomainAvailable(dto.domain);
      }
      data.domain = dto.domain || null;
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.legalName !== undefined) data.legalName = dto.legalName || null;
    if (dto.planKey !== undefined) data.planKey = dto.planKey;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.locale !== undefined) data.locale = dto.locale;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;

    return this.prisma.tenant.update({ where: { id }, data });
  }

  /** Deletes a tenant and its owned data (cascades per schema). */
  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.tenant.delete({ where: { id } });
    this.logger.warn(`Salón eliminado: ${id}`);
  }

  // --- Branding (SUPERADMIN by id / OWNER on self) --------------------------

  /** Merges a branding patch into `Tenant.brand` for the given tenant id. */
  async updateBrand(id: string, patch: BrandDto): Promise<Tenant> {
    const tenant = await this.findById(id);
    const merged = this.mergeBrand(tenant.brand, patch);
    return this.prisma.tenant.update({ where: { id }, data: { brand: merged } });
  }

  // --- Module activation (SUPERADMIN) ---------------------------------------

  /** Activates/deactivates a module for a tenant (upsert by tenant+module). */
  async setModuleActivation(
    tenantId: string,
    dto: ModuleActivationDto,
  ): Promise<ModuleActivation> {
    await this.findById(tenantId);
    const enabled = dto.enabled ?? true;

    return this.prisma.moduleActivation.upsert({
      where: { tenantId_moduleKey: { tenantId, moduleKey: dto.moduleKey } },
      create: { tenantId, moduleKey: dto.moduleKey, enabled },
      update: { enabled },
    });
  }

  /** Lists the module activations of a tenant. */
  async listModules(tenantId: string): Promise<ModuleActivation[]> {
    await this.findById(tenantId);
    return this.prisma.moduleActivation.findMany({
      where: { tenantId },
      orderBy: { moduleKey: 'asc' },
    });
  }

  // --- OWNER self-service ----------------------------------------------------

  /** Returns the caller's own tenant. */
  async findOwn(tenantId: string): Promise<Tenant> {
    return this.findById(tenantId);
  }

  /** Lists the caller's own tenant settings. */
  async listSettings(tenantId: string): Promise<Setting[]> {
    return this.prisma.setting.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });
  }

  /** Upserts a single setting on the caller's own tenant. */
  async upsertSetting(tenantId: string, dto: UpsertSettingDto): Promise<Setting> {
    return this.prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: dto.key } },
      create: {
        tenantId,
        key: dto.key,
        valueJson: dto.valueJson as unknown as Prisma.InputJsonValue,
      },
      update: { valueJson: dto.valueJson as unknown as Prisma.InputJsonValue },
    });
  }

  // --- Public branding -------------------------------------------------------

  /** Minimal public branding lookup by slug for white-label storefronts. */
  async getPublicBranding(slug: string): Promise<BrandingResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      select: {
        slug: true,
        name: true,
        brand: true,
        locale: true,
        currency: true,
        timezone: true,
        status: true,
      },
    });

    if (!tenant || tenant.status === 'CANCELLED' || tenant.status === 'SUSPENDED') {
      throw new NotFoundException('Salón no encontrado');
    }

    return {
      slug: tenant.slug,
      name: tenant.name,
      brand: this.brandToObject(tenant.brand),
      locale: tenant.locale,
      currency: tenant.currency,
      timezone: tenant.timezone,
    };
  }

  // --- helpers ---------------------------------------------------------------

  private async assertSlugAvailable(slug: string): Promise<void> {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un salón con ese slug');
    }
  }

  private async assertDomainAvailable(domain: string): Promise<void> {
    const existing = await this.prisma.tenant.findUnique({
      where: { domain },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un salón con ese dominio');
    }
  }

  private toBrandJson(brand: BrandDto | undefined): Prisma.InputJsonValue | undefined {
    if (!brand) {
      return undefined;
    }
    return this.compact({ ...brand }) as unknown as Prisma.InputJsonValue;
  }

  private mergeBrand(current: Prisma.JsonValue, patch: BrandDto): Prisma.InputJsonValue {
    const base = this.brandToObject(current);
    return { ...base, ...this.compact({ ...patch }) } as unknown as Prisma.InputJsonValue;
  }

  /** Coerces a stored JSON brand value into a plain object (never null/array). */
  private brandToObject(value: Prisma.JsonValue): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  /** Drops `undefined` fields so a patch never overwrites with `undefined`. */
  private compact(source: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(source).filter(([, value]) => value !== undefined),
    );
  }
}
