import { BadRequestException } from '@nestjs/common';

/** Ensures a tenant was resolved for the request; throws otherwise (SPEC §3). */
export function requireTenant(tenantId: string | null): string {
  if (!tenantId) {
    throw new BadRequestException('No se ha podido resolver el salón (tenant)');
  }
  return tenantId;
}
