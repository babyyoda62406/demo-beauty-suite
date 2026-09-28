import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, Matches, Max, Min } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Weekly working window for a specific professional. Times are `HH:mm`;
 * weekday `0` = Sunday. The employee is taken from the route, never the body.
 */
export class CreateEmployeeWorkingHoursDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: 'Día de la semana (0=domingo .. 6=sábado).' })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @ApiProperty({ example: '09:00', description: 'Hora de inicio (HH:mm).' })
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm' })
  startTime!: string;

  @ApiProperty({ example: '18:00', description: 'Hora de fin (HH:mm).' })
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm' })
  endTime!: string;
}

/** Partial update for a working-hours row of an employee. */
export class UpdateEmployeeWorkingHoursDto extends PartialType(CreateEmployeeWorkingHoursDto) {}
