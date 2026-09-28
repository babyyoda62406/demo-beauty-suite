import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type NextFunction, type Request, type Response } from 'express';

import { type AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';

import { tenantStorage, type TenantStore } from './tenant-context';

/** Header used to select a tenant explicitly (development / API clients). */
const TENANT_HEADER = 'x-tenant';

/**
 * Resolves the active tenant for every request and opens an AsyncLocalStorage
 * scope so downstream guards, services and the Prisma middleware share it.
 *
 * Resolution order (SPEC §3):
 *  1. `X-Tenant` header (slug or id) — dev / API clients.
 *  2. Sub-domain (`aurora.fgdbeauty.app`).
 *  3. Custom mapped domain (`Tenant.domain`).
 *
 * When no tenant can be resolved (platform/superadmin routes, health checks)
 * the context is still opened with `tenantId = null` so identity can be added
 * later by the JWT strategy.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const tenantId = await this.resolveTenantId(req);

    const store: TenantStore = { tenantId, userId: null, role: null };
    tenantStorage.run(store, () => next());
  }

  private async resolveTenantId(req: Request): Promise<string | null> {
    const platform = this.config.get('platform', { infer: true });

    // 1) Explicit header (slug or id).
    const headerValue = req.headers[TENANT_HEADER];
    const headerTenant = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (headerTenant && headerTenant.trim().length > 0) {
      const bySlug = await this.findTenantBySlugOrId(headerTenant.trim());
      if (bySlug) {
        return bySlug;
      }
    }

    // 2) Sub-domain of the platform domain.
    const host = this.extractHost(req);
    if (host) {
      const platformDomain = platform.domain;
      if (host.endsWith(`.${platformDomain}`)) {
        const sub = host.slice(0, host.length - platformDomain.length - 1);
        if (sub && sub !== 'www') {
          const bySub = await this.findTenantBySlugOrId(sub);
          if (bySub) {
            return bySub;
          }
        }
      }

      // 3) Custom mapped domain.
      const byDomain = await this.prisma.tenant.findUnique({
        where: { domain: host },
        select: { id: true },
      });
      if (byDomain) {
        return byDomain.id;
      }
    }

    // 4) Fallback (dev / single active tenant): DEFAULT_TENANT_SLUG.
    // Lets the app work on localhost and on the apex domain without an explicit
    // X-Tenant header. In a true multi-tenant deployment leave this unset so
    // unknown hosts resolve to null instead of a default salon.
    const defaultSlug = platform.defaultTenantSlug;
    if (defaultSlug && defaultSlug.trim().length > 0) {
      const byDefault = await this.findTenantBySlugOrId(defaultSlug.trim());
      if (byDefault) {
        return byDefault;
      }
    }

    return null;
  }

  private async findTenantBySlugOrId(value: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: value }, { id: value }] },
      select: { id: true },
    });
    return tenant?.id ?? null;
  }

  private extractHost(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-host'];
    const rawHost = (Array.isArray(forwarded) ? forwarded[0] : forwarded) ?? req.headers.host;
    if (!rawHost) {
      return null;
    }
    // Strip the port and normalise casing.
    return rawHost.split(':')[0]?.toLowerCase() ?? null;
  }
}
