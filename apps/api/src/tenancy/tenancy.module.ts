import { Module } from '@nestjs/common';

import { TenantGuard } from './tenant.guard';

/**
 * Tenancy module. `TenantMiddleware` is applied globally from `AppModule`
 * (it needs to wrap the whole request lifecycle); this module provides the
 * reusable {@link TenantGuard} for routes that require a resolved tenant.
 */
@Module({
  providers: [TenantGuard],
  exports: [TenantGuard],
})
export class TenancyModule {}
