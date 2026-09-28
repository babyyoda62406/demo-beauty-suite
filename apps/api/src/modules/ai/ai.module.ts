import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

/**
 * AI premium module (SPEC §7 `ai`) — design/colour recommendations, hand photo
 * analysis and inspiration moodboards, each persisted as an `AiSuggestion`.
 * Registered centrally in `app.module.ts` during the integration phase.
 */
@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
