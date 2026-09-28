import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * Base query for the statistics endpoints: an optional inclusive date range.
 * When omitted, the service defaults to the last 30 days ending now (UTC).
 * Dates are ISO-8601 strings and interpreted in UTC (SPEC §6 — dates UTC).
 */
export class StatsRangeDto {
  @ApiPropertyOptional({
    description: 'Inicio del periodo (ISO-8601). Por defecto, hace 30 días.',
    example: '2026-07-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fin del periodo (ISO-8601). Por defecto, el instante actual.',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
