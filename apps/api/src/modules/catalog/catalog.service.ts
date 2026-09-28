import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, type Service, type ServiceCategory } from '@prisma/client';

import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { type CreateServiceDto } from './dto/create-service.dto';
import { type QueryServicesDto } from './dto/query-services.dto';
import { type UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { type UpdateServiceDto } from './dto/update-service.dto';

/** Whitelisted, safe columns for service ordering (avoids injection via sortBy). */
const SERVICE_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'name',
  'price',
  'durationMin',
  'createdAt',
  'updatedAt',
]);

/**
 * Catalogue domain service: CRUD for service categories and services, all
 * strictly tenant-scoped (SPEC §3/§6). Every query is additionally filtered by
 * the resolved `tenantId` on top of the Prisma tenant middleware as
 * defence-in-depth, and single-row updates/deletes verify ownership first (the
 * middleware cannot scope unique-`where` writes — see `PrismaService`).
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Categories ------------------------------------------------------------

  async createCategory(tenantId: string, dto: CreateServiceCategoryDto): Promise<ServiceCategory> {
    return this.prisma.serviceCategory.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /** Lists all categories for the tenant, ordered by `sortOrder` then name. */
  async listCategories(tenantId: string): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getCategory(tenantId: string, id: string): Promise<ServiceCategory> {
    const category = await this.prisma.serviceCategory.findFirst({ where: { id, tenantId } });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  async updateCategory(
    tenantId: string,
    id: string,
    dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    await this.getCategory(tenantId, id);
    const data: Prisma.ServiceCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }

  /** Deletes a category. Services keep existing (their `categoryId` is nulled). */
  async deleteCategory(tenantId: string, id: string): Promise<void> {
    await this.getCategory(tenantId, id);
    await this.prisma.serviceCategory.delete({ where: { id } });
  }

  // --- Services --------------------------------------------------------------

  async createService(tenantId: string, dto: CreateServiceDto): Promise<Service> {
    const categoryId = dto.categoryId ?? null;
    if (categoryId) {
      await this.assertCategoryExists(tenantId, categoryId);
    }
    return this.prisma.service.create({
      data: {
        tenantId,
        categoryId,
        name: dto.name.trim(),
        description: dto.description ?? null,
        tagline: dto.tagline ?? null,
        durationMin: dto.durationMin,
        price: dto.price,
        currency: dto.currency ?? 'EUR',
        active: dto.active ?? true,
        imageUrl: dto.imageUrl ?? null,
      },
    });
  }

  /** Admin paginated listing with optional category/active filters. */
  async listServices(tenantId: string, query: QueryServicesDto): Promise<PaginatedResult<Service>> {
    const where: Prisma.ServiceWhereInput = { tenantId };
    if (query.categoryId !== undefined) where.categoryId = query.categoryId;
    if (query.active !== undefined) where.active = query.active;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.resolveServiceOrder(query.sortBy, query.sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.service.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /**
   * Public catalogue: active services for the tenant, optionally filtered by
   * category, ordered by category `sortOrder` then service name. Feeds the
   * public site and the booking wizard (SPEC §9).
   */
  async listPublicServices(tenantId: string, categoryId?: string): Promise<Service[]> {
    const where: Prisma.ServiceWhereInput = { tenantId, active: true };
    if (categoryId !== undefined) where.categoryId = categoryId;
    return this.prisma.service.findMany({
      where,
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  async getService(tenantId: string, id: string): Promise<Service> {
    const service = await this.prisma.service.findFirst({ where: { id, tenantId } });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return service;
  }

  async updateService(tenantId: string, id: string, dto: UpdateServiceDto): Promise<Service> {
    await this.getService(tenantId, id);

    const data: Prisma.ServiceUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.tagline !== undefined) data.tagline = dto.tagline ?? null;
    if (dto.durationMin !== undefined) data.durationMin = dto.durationMin;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl ?? null;
    if (dto.categoryId !== undefined) {
      const categoryId = dto.categoryId ?? null;
      if (categoryId) {
        await this.assertCategoryExists(tenantId, categoryId);
        data.category = { connect: { id: categoryId } };
      } else {
        data.category = { disconnect: true };
      }
    }

    return this.prisma.service.update({ where: { id }, data });
  }

  async deleteService(tenantId: string, id: string): Promise<void> {
    await this.getService(tenantId, id);
    await this.prisma.service.delete({ where: { id } });
  }

  // --- helpers ---------------------------------------------------------------

  private async assertCategoryExists(tenantId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id: categoryId, tenantId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('La categoría indicada no existe en este salón');
    }
  }

  private resolveServiceOrder(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
  ): Prisma.ServiceOrderByWithRelationInput {
    const field = sortBy && SERVICE_SORT_FIELDS.has(sortBy) ? sortBy : 'name';
    return { [field]: sortOrder };
  }
}
