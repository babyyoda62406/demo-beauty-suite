import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** A single line of a store checkout: a product and the requested quantity. */
export class OrderItemInputDto {
  @ApiProperty({ description: 'Id del producto de tienda a comprar.' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1, description: 'Unidades solicitadas.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

/**
 * Store checkout payload (SPEC §7 — tienda online). The server prices each line
 * from the current `Product.price`, validates stock, computes
 * `subtotal`/`total` and creates the `Order` + `OrderItem`s transactionally.
 * `tenantId` is injected server-side; the client is derived from the session for
 * `CLIENT` users (staff may target another `clientId`).
 */
export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemInputDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    default: 0,
    description: 'Gastos de envío en céntimos.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shipping?: number;

  @ApiPropertyOptional({
    description: 'Cliente destinatario (solo personal del salón; ignorado para el rol CLIENT).',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Dirección de envío (JSON libre: calle, ciudad, código postal, país…).',
  })
  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, unknown>;
}
