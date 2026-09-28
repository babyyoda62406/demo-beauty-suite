import { Module } from '@nestjs/common';

import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

/**
 * Loyalty module — stamp cards, vouchers (bonos) and gift cards
 * (SPEC §7 `loyalty`). Registered centrally in `app.module.ts` during the
 * integration phase.
 */
@Module({
  controllers: [LoyaltyController, VouchersController, GiftCardsController],
  providers: [LoyaltyService, VouchersService, GiftCardsService],
  exports: [LoyaltyService, VouchersService, GiftCardsService],
})
export class LoyaltyModule {}
