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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type Service } from '@prisma/client';

import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CatalogService } from './catalog.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

/**
 * Catalogue services. Public reads expose only active services for the resolved
 * tenant (site + booking wizard); administration routes are tenant-scoped and
 * gated by role (SPEC §4/§7/§9).
 */
@ApiTags('catalog')
@Controller('services')
export class ServicesController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('public')
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiOperation({ summary: 'Servicios activos del salón (web pública y wizard de reserva).' })
  listPublic(
    @TenantId() tenantId: string | null,
    @Query('categoryId') categoryId?: string,
  ): Promise<Service[]> {
    return this.catalog.listPublicServices(this.requireTenant(tenantId), categoryId);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de servicios (admin), con filtros.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryServicesDto,
  ): Promise<PaginatedResult<Service>> {
    return this.catalog.listServices(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un servicio por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Service> {
    return this.catalog.getService(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un servicio.' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreateServiceDto): Promise<Service> {
    return this.catalog.createService(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un servicio.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<Service> {
    return this.catalog.updateService(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un servicio.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.catalog.deleteService(this.requireTenant(tenantId), id);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
