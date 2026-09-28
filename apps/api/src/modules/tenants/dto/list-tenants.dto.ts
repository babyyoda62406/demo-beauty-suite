import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanKey, TenantStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Query for the SUPERADMIN tenant listing: pagination + optional filters. */
export class ListTenantsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TenantStatus, description: 'Filtra por estado del salón.' })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ enum: PlanKey, description: 'Filtra por plan contratado.' })
  @IsOptional()
  @IsEnum(PlanKey)
  planKey?: PlanKey;
}
