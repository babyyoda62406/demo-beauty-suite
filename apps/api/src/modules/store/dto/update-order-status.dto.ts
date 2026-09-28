import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Payload to transition a store order to a new lifecycle status
 * (PAID / SHIPPED / DELIVERED / CANCELLED …). Illegal transitions are rejected
 * by the service; moving to `CANCELLED` restocks the reserved units.
 */
export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PAID })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
