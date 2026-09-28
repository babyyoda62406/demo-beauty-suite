import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * Payload to register a payment associated with a booking/order/client.
 * Money is an integer amount of currency minor units (cents); `tenantId` is
 * injected server-side and never accepted from the client (SPEC §6).
 */
export class CreatePaymentDto {
  @ApiProperty({ example: 2500, minimum: 1, description: 'Importe en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description: 'Estado inicial; por defecto PENDING.',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Cliente asociado (del mismo salón).' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Reserva asociada (del mismo salón).' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Pedido asociado (del mismo salón).' })
  @IsOptional()
  @IsString()
  orderId?: string;
}
