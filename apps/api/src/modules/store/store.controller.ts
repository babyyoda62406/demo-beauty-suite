import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Order, type Product } from '@prisma/client';

import { type AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';

import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { QueryStoreProductsDto } from './dto/query-store-products.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { StoreService } from './store.service';

/**
 * Online store endpoints (SPEC §7 — tienda online). The product catalog is
 * `@Public()`; checkout and order reads require a session (a `CLIENT` is scoped
 * to their own orders), and state transitions require salon staff. Every
 * handler is tenant-scoped.
 */
@ApiTags('store')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  // --- Public catalog --------------------------------------------------------

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Catálogo público de la tienda (solo productos activos de tienda).' })
  listProducts(@Query() query: QueryStoreProductsDto): Promise<PaginatedResult<Product>> {
    return this.storeService.listProducts(query);
  }

  // --- Orders ----------------------------------------------------------------

  @Roles('CLIENT', 'OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Checkout: valida stock, calcula totales y crea el pedido con pago pendiente.' })
  checkout(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    return this.storeService.checkout(dto, user);
  }

  @Roles('CLIENT', 'OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('orders')
  @ApiOperation({ summary: 'Lista de pedidos (la clienta ve los suyos; el personal, todos).' })
  listOrders(
    @Query() query: QueryOrdersDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<Order>> {
    return this.storeService.listOrders(query, user);
  }

  @Roles('CLIENT', 'OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('orders/:id')
  @ApiOperation({ summary: 'Detalle de un pedido (la clienta solo puede ver los suyos).' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    return this.storeService.findOne(id, user);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Cambia el estado del pedido (PAID/SHIPPED/DELIVERED/CANCELLED…).' })
  @ApiOkResponse({ description: 'Pedido actualizado.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return this.storeService.updateStatus(id, dto.status);
  }
}
