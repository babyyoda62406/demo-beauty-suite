import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing blog posts with an optional published filter. */
export class QueryBlogPostsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por estado de publicación.' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({ description: 'Filtra por etiqueta (tag).' })
  @IsOptional()
  @IsString()
  tag?: string;
}
