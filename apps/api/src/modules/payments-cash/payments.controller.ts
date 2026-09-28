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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Payment } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsCashService } from './payments-cash.service';
import { requireTenant } from './require-tenant';

/**
 * Payment registration and lookup, tenant-scoped and role-gated (SPEC §4/§7).
 * Card-not-present (Stripe) intents are stubbed pending external integration.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsCashService) {}

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un pago (efectivo, tarjeta, transferencia, etc.).' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreatePaymentDto): Promise<Payment> {
    return this.service.createPayment(requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('stripe/intent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un PaymentIntent de Stripe (pendiente de integración externa).' })
  createStripeIntent(
    @TenantId() tenantId: string | null,
    @Body() dto: CreatePaymentDto,
  ): Promise<never> {
    return this.service.createStripeIntent(requireTenant(tenantId), dto);
  }

  // Literal antes de `:id`, o `me` se tomaría por el id de un pago.
  @Roles('CLIENT')
  @Get('me')
  @ApiOperation({ summary: 'Pagos de la clienta autenticada (su portal).' })
  listMine(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryPaymentsDto,
  ): Promise<PaginatedResult<Payment>> {
    return this.service.listMyPayments(requireTenant(tenantId), userId, query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de pagos, con filtros por método/estado/relación.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryPaymentsDto,
  ): Promise<PaginatedResult<Payment>> {
    return this.service.listPayments(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un pago por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Payment> {
    return this.service.getPayment(requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualiza el estado de un pago (PAID, FAILED, REFUNDED, ...).' })
  updateStatus(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    return this.service.updatePaymentStatus(requireTenant(tenantId), id, dto);
  }
}
