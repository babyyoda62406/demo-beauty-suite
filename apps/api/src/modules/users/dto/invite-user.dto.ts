import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Role } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

import { ASSIGNABLE_ROLES } from './create-user.dto';

/**
 * Payload to invite a staff member. Creates the account in `INVITED` status
 * with a random (unusable) password; the invitee sets their own password via
 * the reset flow. Email delivery is a TODO (see service).
 */
export class InviteUserDto {
  @ApiProperty({ example: 'nueva.empleada@estudioaurora.demo' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nueva Empleada' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({
    enum: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
    default: 'EMPLOYEE',
    description: 'Rol del usuario invitado. No se admite SUPERADMIN.',
  })
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: Role;
}
