import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Payload to record a business expense. Amount is integer cents; `date`
 * defaults to now (UTC) if omitted. `tenantId` is injected server-side (SPEC §6).
 */
export class CreateExpenseDto {
  @ApiProperty({ example: 'Material', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  category!: string;

  @ApiProperty({ example: 4500, minimum: 0, description: 'Importe en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'Compra de esmaltes', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z', description: 'Fecha del gasto (UTC).' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ description: 'Proveedor asociado (del mismo salón).' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
