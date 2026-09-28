import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/**
 * Query for the authenticated user's notification feed (SPEC §7). Always scoped
 * to the current user and salon in the service; optionally filtered to unread.
 */
export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Si es true, devuelve solo las no leídas.' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  unread?: boolean;
}
