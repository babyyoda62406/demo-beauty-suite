import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Payload para deshacer un descuento: devuelve `amount` (céntimos) al saldo.
 * No se puede devolver más de lo que se ha gastado.
 */
export class RefundGiftCardDto {
  @ApiProperty({ example: 2000, minimum: 1, description: 'Importe a devolver al saldo, en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'Me equivoqué de tarjeta', description: 'Por qué se deshace.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string;
}
