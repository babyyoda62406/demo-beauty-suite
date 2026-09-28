import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload to create a gallery item. When `isBeforeAfter` is set the item is a
 * before/after pair (`beforeUrl`/`afterUrl`); otherwise `url` is the image
 * (SPEC §6). `tenantId` is injected server-side and never accepted from client.
 */
export class CreateGalleryItemDto {
  @ApiProperty({ example: 'https://cdn.example.com/galeria/diseno-1.jpg', maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ example: 'nail-art', maxLength: 80, description: 'Categoría para filtrar.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'Si es una pareja antes/después.' })
  @IsOptional()
  @IsBoolean()
  isBeforeAfter?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/galeria/antes.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  beforeUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/galeria/despues.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  afterUrl?: string;

  @ApiPropertyOptional({ example: 'Diseño floral primavera', maxLength: 280 })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0, description: 'Orden de aparición.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}
