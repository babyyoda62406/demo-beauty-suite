import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Role, type UserStatus } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Roles a tenant admin (OWNER/MANAGER) may assign. `SUPERADMIN` is a
 * platform-only role and is intentionally excluded (SPEC §4).
 */
export const ASSIGNABLE_ROLES: readonly Role[] = ['OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'];

/** User statuses that may be set on creation. */
export const CREATABLE_STATUSES: readonly UserStatus[] = ['ACTIVE', 'INVITED', 'SUSPENDED'];

/** Payload to create a staff account within the current tenant. */
export class CreateUserDto {
  @ApiProperty({ example: 'recepcion@estudioaurora.demo' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'contraseña-segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Laura García' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '+34600111222' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
    default: 'EMPLOYEE',
    description: 'Rol del usuario. No se admite SUPERADMIN.',
  })
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: Role;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INVITED', 'SUSPENDED'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(CREATABLE_STATUSES)
  status?: UserStatus;
}
