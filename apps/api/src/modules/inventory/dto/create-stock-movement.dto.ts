import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Payload to register a stock movement against a product. Semantics (applied
 * transactionally in the service, SPEC §6):
 *  - `IN`     → increases stock by `quantity` (quantity must be > 0);
 *  - `OUT`    → decreases stock by `quantity` (quantity must be > 0, cannot go
 *               below zero);
 *  - `ADJUST` → sets the stock to the absolute value `quantity` (>= 0).
 */
export class CreateStockMovementDto {
  @ApiProperty({ enum: StockMovementKind, example: StockMovementKind.IN })
  @IsEnum(StockMovementKind)
  kind!: StockMovementKind;

  @ApiProperty({
    example: 5,
    minimum: 0,
    description: 'Unidades a añadir/retirar (IN/OUT) o stock absoluto (ADJUST).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Recepción de pedido', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Reserva asociada al consumo (del mismo salón).' })
  @IsOptional()
  @IsString()
  bookingId?: string | null;
}
