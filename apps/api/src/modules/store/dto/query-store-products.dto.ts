import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/**
 * Public storefront catalog query (SPEC §7 — tienda online). Only active
 * `isStoreItem` products of the resolved tenant are ever returned; this DTO adds
 * an optional category filter on top of the common pagination/search fields.
 */
export class QueryStoreProductsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por categoría de producto.' })
  @IsOptional()
  @IsString()
  category?: string;
}
