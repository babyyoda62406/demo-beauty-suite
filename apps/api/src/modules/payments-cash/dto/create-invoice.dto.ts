import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** A single billable line of an invoice. Prices are integer cents (SPEC §6). */
export class InvoiceItemDto {
  @ApiProperty({ example: 'Manicura semipermanente', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: 1, minimum: 1, description: 'Cantidad.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 2500, minimum: 0, description: 'Precio unitario en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice!: number;
}

/**
 * Payload to create an invoice. The server computes `subtotal`/`tax`/`total`
 * from the items and the optional tax rate, and assigns a per-tenant sequential
 * `number` transactionally (SPEC §6). `tenantId` is injected server-side.
 */
export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Cliente destinatario (del mismo salón).' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ type: [InvoiceItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];

  @ApiPropertyOptional({
    example: 21,
    minimum: 0,
    maximum: 100,
    default: 0,
    description: 'Tipo impositivo en porcentaje (IVA). El impuesto se calcula sobre el subtotal.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
