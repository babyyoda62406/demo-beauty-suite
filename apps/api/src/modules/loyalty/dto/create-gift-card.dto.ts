import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload to issue/sell a gift card. `balance` is initialised to
 * `initialAmount` (cents). If no `code` is supplied a unique one is generated
 * for the salon; `tenantId` is injected server-side (SPEC §6).
 */
export class CreateGiftCardDto {
  @ApiProperty({ example: 5000, minimum: 1, description: 'Importe/saldo inicial en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  initialAmount!: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    example: 'GC-A1B2C3',
    description: 'Código único de la tarjeta. Si se omite se genera automáticamente.',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'code solo admite letras, números y guiones' })
  code?: string;

  @ApiPropertyOptional({ example: 'clx123client', description: 'Clienta que compra la tarjeta.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  purchasedByClientId?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', description: 'Caducidad (ISO-8601, UTC).' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    example: 'ciruela',
    description: 'Plantilla con la que se dibuja la tarjeta al compartirla.',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-z0-9-]+$/, { message: 'design solo admite minúsculas, números y guiones' })
  design?: string;

  @ApiPropertyOptional({ example: 'Laura', description: 'A quién se regala: el «Para:» de la tarjeta.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  recipientName?: string;

  @ApiPropertyOptional({ example: 'Marta', description: 'Quién la regala: el «De:» de la tarjeta.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  senderName?: string;

  @ApiPropertyOptional({
    example: 'clx123service',
    description: 'Servicio regalado. Si se indica, el importe es el precio de ese servicio.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  serviceId?: string;
}
