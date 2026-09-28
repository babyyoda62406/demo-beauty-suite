import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

/** Query for the daily cash register summary. `date` defaults to today (UTC). */
export class CashRegisterSummaryQueryDto {
  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Día a resumir (UTC). Acepta fecha o fecha-hora ISO-8601; por defecto hoy.',
  })
  @IsOptional()
  @IsISO8601()
  date?: string;
}
