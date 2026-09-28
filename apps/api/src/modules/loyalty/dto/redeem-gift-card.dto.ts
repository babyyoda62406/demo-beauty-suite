import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Payload to redeem an amount (cents) against a gift card's balance. The amount
 * must not exceed the current balance; the card is marked `REDEEMED` when the
 * balance reaches zero.
 */
export class RedeemGiftCardDto {
  @ApiProperty({ example: 2000, minimum: 1, description: 'Importe a consumir en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'clx123client', description: 'Clienta que canjea la tarjeta.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  redeemedByClientId?: string;

  @ApiPropertyOptional({ example: 'Manicura semipermanente', description: 'En qué se gastó.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string;
}
