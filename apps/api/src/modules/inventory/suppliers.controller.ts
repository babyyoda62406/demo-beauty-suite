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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Supplier } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { InventoryService } from './inventory.service';

/**
 * Supplier administration. Tenant-scoped and gated by role (SPEC §4/§7):
 * staff may read, OWNER/MANAGER may create/update/delete.
 */
@ApiTags('inventory')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de proveedores (admin).' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QuerySuppliersDto,
  ): Promise<PaginatedResult<Supplier>> {
    return this.inventory.listSuppliers(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un proveedor por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Supplier> {
    return this.inventory.getSupplier(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un proveedor.' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreateSupplierDto): Promise<Supplier> {
    return this.inventory.createSupplier(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un proveedor.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    return this.inventory.updateSupplier(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un proveedor.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.inventory.deleteSupplier(this.requireTenant(tenantId), id);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
