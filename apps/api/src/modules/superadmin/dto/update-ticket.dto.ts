import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Updates a support ticket's workflow fields (SUPERADMIN). */
export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus, description: 'Nuevo estado de la incidencia.' })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority, description: 'Nueva prioridad.' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Asunto actualizado.' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Descripción actualizada.' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description?: string;
}
