import { Module } from '@nestjs/common';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

/**
 * Statistics module (SPEC §7 `stats`) — read-only tenant-scoped dashboards.
 * Registered centrally in `app.module.ts` during the integration phase.
 */
@Module({
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
