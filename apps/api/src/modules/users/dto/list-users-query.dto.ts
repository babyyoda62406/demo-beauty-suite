import { ApiPropertyOptional } from '@nestjs/swagger';
import { type Role, type UserStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Fields that may be used to sort the users list (allowlist, SPEC §7). */
export const USER_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'role',
  'status',
] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/** Query for the paginated users list with optional role/status filters. */
export class ListUsersQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['SUPERADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
    description: 'Filtra por rol.',
  })
  @IsOptional()
  @IsIn(['SUPERADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'])
  role?: Role;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INVITED', 'SUSPENDED'], description: 'Filtra por estado.' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INVITED', 'SUSPENDED'])
  status?: UserStatus;
}
