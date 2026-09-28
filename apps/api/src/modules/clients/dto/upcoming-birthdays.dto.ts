import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Query for the upcoming-birthdays report: look-ahead window in days. */
export class UpcomingBirthdaysDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 366,
    default: 30,
    description: 'Ventana de días hacia adelante para buscar cumpleaños.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  days: number = 30;
}
