import { SetMetadata } from '@nestjs/common';
import { type Role } from '@prisma/client';

/** Metadata key carrying the roles allowed on a route. */
export const ROLES_KEY = 'roles';

/** Restricts a route/controller to the given roles (enforced by `RolesGuard`). */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
