import { ApiPropertyOptional } from '@nestjs/swagger';
import { GiftCardStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing gift cards, optionally filtered by status. */
export class QueryGiftCardsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: GiftCardStatus, description: 'Filtra por estado de la tarjeta.' })
  @IsOptional()
  @IsEnum(GiftCardStatus)
  status?: GiftCardStatus;
}
