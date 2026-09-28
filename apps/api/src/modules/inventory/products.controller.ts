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
import { type Product, type StockMovement } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreateProductDto } from './dto/create-product.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryLowStockDto } from './dto/query-low-stock.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InventoryService } from './inventory.service';

/**
 * Product administration and stock movements. All routes are tenant-scoped and
 * gated by role (SPEC §4/§7): reads/movements are open to staff, product
 * configuration (create/update/delete) is restricted to OWNER/MANAGER.
 */
@ApiTags('inventory')
@Controller('products')
export class ProductsController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de productos (admin), con filtros.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryProductsDto,
  ): Promise<PaginatedResult<Product>> {
    return this.inventory.listProducts(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un producto por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Product> {
    return this.inventory.getProduct(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un producto.' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreateProductDto): Promise<Product> {
    return this.inventory.createProduct(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un producto.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.inventory.updateProduct(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un producto.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.inventory.deleteProduct(this.requireTenant(tenantId), id);
  }

  // --- Stock movements -------------------------------------------------------

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post(':id/stock-movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un movimiento de stock (IN/OUT/ADJUST) y actualiza el stock.' })
  createStockMovement(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    return this.inventory.createStockMovement(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id/stock-movements')
  @ApiOperation({ summary: 'Historial paginado de movimientos de stock de un producto.' })
  listStockMovements(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Query() query: QueryLowStockDto,
  ): Promise<PaginatedResult<StockMovement>> {
    return this.inventory.listStockMovements(this.requireTenant(tenantId), id, query);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
