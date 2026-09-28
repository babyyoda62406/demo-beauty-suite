import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

/**
 * Window for an employee's performance report. Defaults (applied in the service)
 * to the current calendar month when both bounds are omitted.
 */
export class PerformanceQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z', description: 'Desde (inclusive, ISO-8601 UTC).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.999Z', description: 'Hasta (exclusive, ISO-8601 UTC).' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
