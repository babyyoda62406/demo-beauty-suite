import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Optional reason recorded when cancelling a booking. */
export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'Motivo de la cancelación (se anexa a las notas).' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
