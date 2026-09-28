import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { getTenantStore, type TenantStore } from './tenant-context';

/**
 * Injects the current tenant id resolved by `TenantMiddleware`.
 * Returns `null` for platform/superadmin requests without a tenant.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string | null => getTenantStore()?.tenantId ?? null,
);

/** Injects the full tenant/identity context of the current request. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): TenantStore | undefined => getTenantStore(),
);
