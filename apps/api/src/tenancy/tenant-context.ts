import { AsyncLocalStorage } from 'node:async_hooks';

import { type Role } from '@prisma/client';

/**
 * Per-request tenant/identity context propagated via AsyncLocalStorage.
 *
 * The store object is intentionally mutable: `TenantMiddleware` seeds it with
 * the resolved `tenantId` before the guard chain runs, and the JWT strategy
 * later fills in `userId`/`role` once the access token is validated — all
 * within the same async context. The Prisma middleware reads this store to
 * auto-scope every tenant-owned query (SPEC §3).
 */
export interface TenantStore {
  tenantId: string | null;
  userId: string | null;
  role: Role | null;
}

/** Global storage instance holding the current request's tenant context. */
export const tenantStorage = new AsyncLocalStorage<TenantStore>();

/** Returns the active tenant store, or `undefined` outside a request scope. */
export function getTenantStore(): TenantStore | undefined {
  return tenantStorage.getStore();
}

/** Convenience accessor for the current tenant id (or `null`). */
export function getCurrentTenantId(): string | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}
