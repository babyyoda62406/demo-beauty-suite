import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * Payload to close the open cash session. `closingAmount` is the physically
 * counted cash in the drawer (cents); the service computes the expected amount
 * (opening float + CASH payments of the session) and the difference (SPEC §6).
 */
export class CloseCashSessionDto {
  @ApiProperty({ example: 35000, minimum: 0, description: 'Efectivo contado al cierre, en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  closingAmount!: number;
}
