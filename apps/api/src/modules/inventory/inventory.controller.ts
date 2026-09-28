import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Product } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { QueryLowStockDto } from './dto/query-low-stock.dto';
import { InventoryService } from './inventory.service';

/**
 * Inventory reports. Tenant-scoped and gated by role (SPEC §4/§7).
 */
@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock igual o por debajo de su umbral bajo.' })
  lowStock(
    @TenantId() tenantId: string | null,
    @Query() query: QueryLowStockDto,
  ): Promise<PaginatedResult<Product>> {
    return this.inventory.listLowStock(this.requireTenant(tenantId), query);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
