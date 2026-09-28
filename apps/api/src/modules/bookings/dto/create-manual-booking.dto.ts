import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Staff-created booking for an existing client (source `ADMIN`). Created as
 * `CONFIRMED` since the salon schedules it directly.
 */
export class CreateManualBookingDto {
  @ApiProperty({ description: 'Id de la clienta existente.' })
  @IsString()
  clientId!: string;

  @ApiProperty({ description: 'Id del servicio a reservar.' })
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Profesional asignado (opcional).' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ example: '2026-08-15T10:00:00.000Z', description: 'Inicio de la cita (ISO-8601 UTC).' })
  @IsISO8601()
  startAt!: string;

  @ApiPropertyOptional({ description: 'Notas internas de la cita.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
