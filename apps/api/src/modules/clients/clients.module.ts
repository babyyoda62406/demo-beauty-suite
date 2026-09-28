import { Module } from '@nestjs/common';

import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

/**
 * Clients CRM module (SPEC §7 `clients`). Registered centrally in
 * `app.module.ts` during the integration phase.
 */
@Module({
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
