import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing message templates, optionally filtered by channel. */
export class QueryMessageTemplatesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: MessageChannel, description: 'Filtra por canal.' })
  @IsOptional()
  @IsEnum(MessageChannel)
  channel?: MessageChannel;
}
