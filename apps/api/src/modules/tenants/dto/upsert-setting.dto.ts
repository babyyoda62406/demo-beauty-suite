import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Upserts a single tenant setting keyed by `(tenantId, key)` (SPEC §6 —
 * `Setting`). `valueJson` is stored verbatim as a JSON object (OWNER).
 */
export class UpsertSettingDto {
  @ApiProperty({ example: 'booking.slotMinutes', description: 'Clave del ajuste.' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_.:-]+$/, {
    message: 'key admite letras, números y ._:- (p.ej. "booking.slotMinutes")',
  })
  key!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Valor del ajuste como objeto JSON.',
  })
  @IsObject()
  valueJson!: Record<string, unknown>;
}
