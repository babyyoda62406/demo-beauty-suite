import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload to create a supplier. `tenantId` is injected server-side and never
 * accepted from the client (SPEC §3).
 */
export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuciones Belleza SL', minLength: 2, maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'María López', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  contact?: string;

  @ApiPropertyOptional({ example: 'ventas@belleza.example', maxLength: 254 })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: '+34600111222', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
