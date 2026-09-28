import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Public self-booking payload (SPEC §4 — reserva sin registro). The client is
 * created/associated by phone within the resolved tenant; the booking is always
 * created as `PENDING` with source `PUBLIC`.
 */
export class CreatePublicBookingDto {
  @ApiProperty({ description: 'Id del servicio a reservar.' })
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Profesional solicitado (opcional).' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ example: '2026-08-15T10:00:00.000Z', description: 'Inicio de la cita (ISO-8601 UTC).' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ example: 'Laura García', description: 'Nombre de la clienta.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+34600111222', description: 'Teléfono de contacto (clave de asociación).' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({ example: 'laura@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Notas o preferencias de la clienta.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
