import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Coerces the strings `'true'`/`'false'` (query params) into booleans. */
const toOptionalBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

/**
 * Admin query for listing products with optional filters. Free-text `search`
 * (from {@link PaginationDto}) matches name / SKU / category.
 */
export class QueryProductsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por categoría.' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filtra por proveedor.' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Filtra por estado (activo/inactivo).' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filtra por artículos de tienda online.' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isStoreItem?: boolean;
}
