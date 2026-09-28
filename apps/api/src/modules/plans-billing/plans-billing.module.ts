import { Module } from '@nestjs/common';

import { BillingController } from './billing.controller';
import { PlansController } from './plans.controller';
import { PlansBillingService } from './plans-billing.service';
import { SubscriptionsController } from './subscriptions.controller';

/**
 * Plans & billing domain (SPEC §6, §7): public plan catalogue with SUPERADMIN
 * CRUD, tenant subscriptions, and the Stripe webhook. `PrismaService` is
 * provided globally; guards/decorators come from the auth/tenancy core.
 * Registered in `app.module.ts` during the integration phase.
 */
@Module({
  controllers: [PlansController, SubscriptionsController, BillingController],
  providers: [PlansBillingService],
  exports: [PlansBillingService],
})
export class PlansBillingModule {}
