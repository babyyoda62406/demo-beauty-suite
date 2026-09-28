import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { StatsRangeDto } from './stats-range.dto';

/** Time bucket size for the revenue time series. */
export type RevenueGranularity = 'day' | 'week' | 'month';

/** Allowed granularities (also used to validate the query param). */
export const REVENUE_GRANULARITIES: readonly RevenueGranularity[] = ['day', 'week', 'month'];

/** Query for the revenue time series: a date range plus a bucket granularity. */
export class RevenueQueryDto extends StatsRangeDto {
  @ApiPropertyOptional({
    enum: REVENUE_GRANULARITIES,
    default: 'day',
    description: 'Tamaño de los intervalos de la serie temporal de facturación.',
  })
  @IsOptional()
  @IsIn(REVENUE_GRANULARITIES)
  granularity: RevenueGranularity = 'day';
}
