import { Module } from '@nestjs/common';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

/**
 * Tenants/salons domain module (SPEC §3, §7). `PrismaService` is provided
 * globally by `PrismaModule`; auth/RBAC guards are registered globally. Wired
 * into `AppModule` during the integration phase.
 */
@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
