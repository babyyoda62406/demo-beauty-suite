import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing loyalty cards, optionally filtered by client. */
export class QueryLoyaltyCardsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por clienta.' })
  @IsOptional()
  @IsString()
  clientId?: string;
}
