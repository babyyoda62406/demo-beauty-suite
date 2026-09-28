import { Module } from '@nestjs/common';

import { StoreController } from './store.controller';
import { StoreService } from './store.service';

/**
 * Online store domain (SPEC §7 — tienda online): public product catalog,
 * authenticated checkout with stock reservation and a pending Stripe payment,
 * order listing/detail (client-scoped for the `CLIENT` role) and the staff
 * order state machine with restock on cancellation. `PrismaService` is provided
 * globally; this module is registered in `app.module.ts` during integration.
 */
@Module({
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
