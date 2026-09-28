import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '@prisma/client';
import { IsEnum, IsOptional, Matches } from 'class-validator';

/** `YYYY-MM` period matcher (e.g. `2026-08`). */
const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Query for listing an employee's commissions, optionally by period/status. */
export class CommissionsQueryDto {
  @ApiPropertyOptional({ example: '2026-08', description: 'Periodo YYYY-MM.' })
  @IsOptional()
  @Matches(PERIOD_REGEX, { message: 'period debe tener formato YYYY-MM' })
  period?: string;

  @ApiPropertyOptional({ enum: CommissionStatus, description: 'Filtra por estado.' })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;
}

/** Body/query to (re)calculate commissions for a given period. */
export class CalculateCommissionsDto {
  @ApiProperty({ example: '2026-08', description: 'Periodo YYYY-MM a calcular.' })
  @Matches(PERIOD_REGEX, { message: 'period debe tener formato YYYY-MM' })
  period!: string;
}
