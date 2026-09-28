import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload to open a loyalty card for a client of the resolved salon. There is
 * one card per client (unique `tenantId + clientId`); `tenantId` is injected
 * server-side and never accepted from the client (SPEC §3/§6).
 */
export class CreateLoyaltyCardDto {
  @ApiProperty({ example: 'clx123client', description: 'Id de la clienta (del mismo salón).' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  clientId!: string;
}
