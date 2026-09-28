import { Module } from '@nestjs/common';

import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ProductsController } from './products.controller';
import { SuppliersController } from './suppliers.controller';

/**
 * Inventory module — products, suppliers and stock movements (SPEC §7
 * `inventory`). Registered centrally in `app.module.ts` during the integration
 * phase.
 */
@Module({
  controllers: [ProductsController, SuppliersController, InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
