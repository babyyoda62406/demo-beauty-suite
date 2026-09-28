import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing services with optional category/active filters. */
export class QueryServicesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por categoría.' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtra por estado (activo/inactivo).' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;
}
