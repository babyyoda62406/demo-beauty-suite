import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to redeem one earned free reward from a loyalty card. Fails if the
 * card has no `freeEarned` rewards available.
 */
export class RedeemRewardDto {
  @ApiPropertyOptional({ example: 'clx123booking', description: 'Reserva en la que se aplica la recompensa.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookingId?: string;

  @ApiPropertyOptional({ example: 'REDEEM_FREE', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}
