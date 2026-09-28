import { ApiPropertyOptional } from '@nestjs/swagger';
import { type Role } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

import { ASSIGNABLE_ROLES } from './create-user.dto';

/**
 * Partial update of a staff account. Password changes go through the dedicated
 * reset-password endpoint; status changes through activate/deactivate.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'recepcion@estudioaurora.demo' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Laura García' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '+34600111222', nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
    description: 'Rol del usuario. No se admite SUPERADMIN.',
  })
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: Role;
}
