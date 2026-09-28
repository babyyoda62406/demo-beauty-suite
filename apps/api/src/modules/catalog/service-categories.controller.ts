import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type ServiceCategory } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId } from '../../tenancy/decorators';

import { CatalogService } from './catalog.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

/**
 * Service categories administration. All routes are tenant-scoped and limited
 * to salon administrators; write operations require OWNER/MANAGER (SPEC §4/§7).
 */
@ApiTags('catalog')
@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly catalog: CatalogService) {}

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista las categorías de servicios del salón.' })
  list(@TenantId() tenantId: string | null): Promise<ServiceCategory[]> {
    return this.catalog.listCategories(this.requireTenant(tenantId));
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una categoría por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<ServiceCategory> {
    return this.catalog.getCategory(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una categoría de servicios.' })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    return this.catalog.createCategory(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza una categoría de servicios.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    return this.catalog.updateCategory(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una categoría (los servicios quedan sin categoría).' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.catalog.deleteCategory(this.requireTenant(tenantId), id);
  }

  /** Ensures a tenant was resolved for the request (admin routes require one). */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
