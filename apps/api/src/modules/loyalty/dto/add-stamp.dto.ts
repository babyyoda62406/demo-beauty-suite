import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Payload to add stamps to a loyalty card (typically one per completed
 * service). Every {@link ../loyalty.service STAMPS_PER_REWARD} stamps convert
 * into a free reward automatically.
 */
export class AddStampDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    maximum: 100,
    default: 1,
    description: 'Número de sellos a añadir.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;

  @ApiPropertyOptional({ example: 'clx123booking', description: 'Reserva completada que origina el sello.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookingId?: string;

  @ApiPropertyOptional({ example: 'SERVICE_COMPLETED', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}
