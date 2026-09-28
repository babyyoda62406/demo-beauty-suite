import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Subscription } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId } from '../../tenancy/decorators';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { PlansBillingService } from './plans-billing.service';

/**
 * Tenant subscription management (SPEC §6). The salon owner subscribes to and
 * cancels the plan; the tenant is always taken from the request context so no
 * salon can act on another's subscription. Mounted under `/api/v1/subscriptions`.
 */
@ApiTags('plans-billing')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: PlansBillingService) {}

  @Roles('OWNER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Suscribe el salón actual a un plan.' })
  @ApiOkResponse({ description: 'Suscripción creada.' })
  subscribe(
    @Body() dto: CreateSubscriptionDto,
    @TenantId() tenantId: string | null,
  ): Promise<Subscription> {
    return this.service.subscribe(dto, tenantId);
  }

  @Roles('OWNER', 'MANAGER')
  @Get('me')
  @ApiOperation({ summary: 'Suscripción actual del salón.' })
  @ApiOkResponse({ description: 'Suscripción del salón resuelto.' })
  getMySubscription(@TenantId() tenantId: string | null): Promise<Subscription> {
    return this.service.getMySubscription(tenantId);
  }

  @Roles('OWNER')
  @Post('me/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela la suscripción activa del salón.' })
  @ApiOkResponse({ description: 'Suscripción cancelada.' })
  cancelMySubscription(@TenantId() tenantId: string | null): Promise<Subscription> {
    return this.service.cancelMySubscription(tenantId);
  }
}
