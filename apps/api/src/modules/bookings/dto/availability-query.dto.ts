import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * Query for the public availability endpoint. `date` is a calendar day in
 * `YYYY-MM-DD`; slots are computed from the employee working hours, approved
 * time off, the service duration and existing (non-cancelled) bookings.
 */
export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Id del servicio a reservar.' })
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({
    description: 'Id del profesional. Si se omite se agregan los slots de todos los profesionales.',
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ example: '2026-08-15', description: 'Día a consultar (YYYY-MM-DD, UTC).' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date debe tener formato YYYY-MM-DD' })
  date!: string;
}

/** A single bookable slot for a service on a given day. */
export class AvailabilitySlotDto {
  @ApiProperty({ description: 'Inicio del slot (ISO-8601 UTC).' })
  startAt!: string;

  @ApiProperty({ description: 'Fin del slot (ISO-8601 UTC).' })
  endAt!: string;

  @ApiProperty({ type: [String], description: 'Profesionales disponibles para este slot.' })
  employeeIds!: string[];
}

/** Availability response for a service on a specific day. */
export class AvailabilityResponseDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty({ example: '2026-08-15' })
  date!: string;

  @ApiProperty({ description: 'Duración del servicio en minutos.' })
  durationMin!: number;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  slots!: AvailabilitySlotDto[];
}
