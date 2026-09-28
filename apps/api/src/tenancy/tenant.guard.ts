import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

import { getTenantStore } from './tenant-context';

/**
 * Ensures a tenant context is present for tenant-scoped routes. Public routes
 * and `SUPERADMIN` callers (platform-level operations) are exempt.
 *
 * Not registered globally by default — apply per controller/route where a
 * resolved tenant is mandatory, e.g. `@UseGuards(TenantGuard)`.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const store = getTenantStore();
    if (store?.role === 'SUPERADMIN') {
      return true;
    }

    if (!store?.tenantId) {
      throw new ForbiddenException('No se ha podido resolver el salón (tenant) de la petición');
    }

    return true;
  }
}
