import { Module } from '@nestjs/common';

import { CatalogService } from './catalog.service';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServicesController } from './services.controller';

/**
 * Catalogue module — service categories and services (SPEC §7 `catalog`).
 * Registered centrally in `app.module.ts` during the integration phase.
 */
@Module({
  controllers: [ServiceCategoriesController, ServicesController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
