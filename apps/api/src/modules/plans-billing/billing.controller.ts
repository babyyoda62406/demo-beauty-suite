import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';

import { Public } from '../../auth/decorators/public.decorator';

import { PlansBillingService } from './plans-billing.service';

/**
 * Stripe billing webhook (SPEC §5). Public because Stripe calls it unauthenticated;
 * trust is established by verifying the `Stripe-Signature` header against the raw
 * request body (verification stubbed — see the service). Mounted under
 * `/api/v1/billing/webhook`.
 *
 * NOTE(integration): the global JSON parser must be bypassed for this route so
 * the RAW body is available for signature verification; wiring that raw-body
 * parser belongs to the integration phase (main.ts), not this module.
 */
@ApiTags('plans-billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly service: PlansBillingService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  handleWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    return this.service.handleStripeWebhook(payload, signature);
  }
}
