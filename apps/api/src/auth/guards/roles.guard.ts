import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Role } from '@prisma/client';
import { type Request } from 'express';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { type AuthenticatedUser } from '../auth.types';

/**
 * RBAC guard. Allows the request when no `@Roles()` are declared, the route is
 * `@Public()`, or the authenticated user's role is in the allowed set. A
 * `SUPERADMIN` is always allowed (platform-wide access). Runs after the JWT
 * guard in the global guard chain (SPEC §4).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (user.role === 'SUPERADMIN' || requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('No tienes permisos para realizar esta acción');
  }
}
