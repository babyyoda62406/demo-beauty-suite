import { ApiPropertyOptional } from '@nestjs/swagger';
import { WaitlistStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Paginated waitlist listing, optionally filtered by status. */
export class QueryWaitlistDto extends PaginationDto {
  @ApiPropertyOptional({ enum: WaitlistStatus, description: 'Filtra por estado de la entrada.' })
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;
}
