import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload to sell a voucher (bono) of N prepaid sessions to a client. Money is
 * stored as integer minor units (cents); `tenantId` is injected server-side
 * (SPEC §6). An optional `serviceId` binds the voucher to a single service.
 */
export class CreateVoucherDto {
  @ApiProperty({ example: 'clx123client', description: 'Id de la clienta titular del bono.' })
  @IsString()
  @MaxLength(64)
  clientId!: string;

  @ApiPropertyOptional({
    example: 'clx123service',
    nullable: true,
    description: 'Servicio al que aplica el bono (del mismo salón). Nulo = genérico.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  serviceId?: string | null;

  @ApiProperty({ example: 5, minimum: 1, maximum: 1000, description: 'Número de sesiones del bono.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  totalSessions!: number;

  @ApiProperty({ example: 10000, minimum: 0, description: 'Precio pagado en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', description: 'Caducidad (ISO-8601, UTC).' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
