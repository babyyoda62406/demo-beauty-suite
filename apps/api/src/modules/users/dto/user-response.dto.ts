import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Role, type UserStatus } from '@prisma/client';

/**
 * Public projection of a staff `User`. The `passwordHash` column is never
 * selected nor exposed (SPEC §5). Returned by every users endpoint.
 */
export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true, type: String })
  tenantId!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['SUPERADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'] })
  role!: Role;

  @ApiProperty({ enum: ['ACTIVE', 'INVITED', 'SUSPENDED'] })
  status!: UserStatus;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
