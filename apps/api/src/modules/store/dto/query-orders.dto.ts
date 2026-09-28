import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/**
 * Store orders listing query (SPEC §7). A `CLIENT` only ever sees their own
 * orders (enforced in the service); staff/admin see every order of the salon.
 * Optionally filtered by lifecycle status.
 */
export class QueryOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filtra por estado del pedido.' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
