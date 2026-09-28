import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { StatsRangeDto } from './stats-range.dto';

/** Query for the top-services ranking: a date range plus a result limit. */
export class TopServicesQueryDto extends StatsRangeDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    default: 10,
    description: 'Número máximo de servicios a devolver en el ranking.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
