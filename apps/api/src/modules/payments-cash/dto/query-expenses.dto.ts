import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing expenses with optional category/date-range filters. */
export class QueryExpensesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por categoría.' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z', description: 'Desde (inclusive, UTC).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.999Z', description: 'Hasta (inclusive, UTC).' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
