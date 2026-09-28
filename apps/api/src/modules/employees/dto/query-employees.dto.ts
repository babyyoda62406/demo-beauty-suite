import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing employees with optional active/bookable filters. */
export class QueryEmployeesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por estado (activo/inactivo).' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filtra por reservable en agenda pública.' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  bookable?: boolean;
}
