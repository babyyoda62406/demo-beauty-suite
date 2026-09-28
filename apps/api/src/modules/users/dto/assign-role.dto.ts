import { ApiProperty } from '@nestjs/swagger';
import { type Role } from '@prisma/client';
import { IsIn } from 'class-validator';

import { ASSIGNABLE_ROLES } from './create-user.dto';

/** Payload to (re)assign a user's role. `SUPERADMIN` is never accepted. */
export class AssignRoleDto {
  @ApiProperty({
    enum: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
    description: 'Nuevo rol. No se admite SUPERADMIN.',
  })
  @IsIn(ASSIGNABLE_ROLES)
  role!: Role;
}
