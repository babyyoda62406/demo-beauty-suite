import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Query for the platform-wide support ticket listing (SUPERADMIN only). */
export class ListTicketsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por salón (tenant) concreto.' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: TicketStatus, description: 'Filtra por estado de la incidencia.' })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority, description: 'Filtra por prioridad.' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
