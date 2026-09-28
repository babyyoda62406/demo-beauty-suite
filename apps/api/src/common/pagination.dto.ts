import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants';

export type SortOrder = 'asc' | 'desc';

/** Common query DTO for paginated list endpoints (SPEC §7). */
export class PaginationDto {
  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE, description: 'Número de página (1-based).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    description: 'Elementos por página.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ description: 'Campo por el que ordenar.' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Dirección de orden.' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';

  @ApiPropertyOptional({ description: 'Término de búsqueda libre.' })
  @IsOptional()
  @IsString()
  search?: string;

  /** Number of rows to skip for the current page. */
  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }

  /** Number of rows to take for the current page. */
  get take(): number {
    return this.pageSize;
  }
}

/** Metadata describing a page within a result set. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Envelope for a page of results. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Builds a {@link PaginatedResult} from a page of rows and the total count. */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  pagination: Pick<PaginationDto, 'page' | 'pageSize'>,
): PaginatedResult<T> {
  const totalPages = pagination.pageSize > 0 ? Math.ceil(total / pagination.pageSize) : 0;
  return {
    data,
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
}
