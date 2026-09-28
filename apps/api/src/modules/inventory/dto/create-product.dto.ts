import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Payload to create an inventory product. Money is stored as an integer amount
 * of currency minor units (cents); `tenantId` is injected server-side and never
 * accepted from the client (SPEC §3/§6).
 */
export class CreateProductDto {
  @ApiProperty({ example: 'ESM-ROJO-01', minLength: 1, maxLength: 64, description: 'SKU único por salón.' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku!: string;

  @ApiProperty({ example: 'Esmalte semipermanente rojo', minLength: 2, maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Bote de 15ml, acabado brillante.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Esmaltes', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiProperty({ example: 1200, minimum: 0, description: 'Precio de venta en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 650, minimum: 0, description: 'Coste de compra en céntimos.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 10, minimum: 0, default: 0, description: 'Stock inicial (unidades).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    default: 0,
    description: 'Umbral de stock bajo; stock <= umbral aparece en /inventory/low-stock.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ nullable: true, description: 'Id del proveedor (del mismo salón).' })
  @IsOptional()
  @IsString()
  supplierId?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/productos/esmalte.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Si el producto está activo.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: false, default: false, description: 'Si se vende en la tienda online.' })
  @IsOptional()
  @IsBoolean()
  isStoreItem?: boolean;
}
