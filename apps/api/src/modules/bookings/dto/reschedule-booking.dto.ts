import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

/** New start (and optionally professional) for a rescheduled booking. */
export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-08-16T11:00:00.000Z', description: 'Nuevo inicio (ISO-8601 UTC).' })
  @IsISO8601()
  startAt!: string;

  @ApiPropertyOptional({ description: 'Reasignar a otro profesional (opcional).' })
  @IsOptional()
  @IsString()
  employeeId?: string;
}
