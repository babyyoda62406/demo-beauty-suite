import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing testimonials with an optional approval filter. */
export class QueryTestimonialsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por estado de aprobación.' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  approved?: boolean;
}
