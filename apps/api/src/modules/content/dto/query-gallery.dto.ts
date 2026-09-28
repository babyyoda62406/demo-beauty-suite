import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Transforms the loose query string boolean into a real boolean. */
const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

/** Public gallery filters: category and/or before-after flag (SPEC §9). */
export class PublicGalleryQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por categoría.' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filtra por parejas antes/después.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isBeforeAfter?: boolean;
}

/** Admin paginated gallery query with the same optional filters. */
export class QueryGalleryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por categoría.' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filtra por parejas antes/después.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isBeforeAfter?: boolean;
}
