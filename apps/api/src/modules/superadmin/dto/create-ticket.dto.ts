import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Opens a support ticket for a given salon (SUPERADMIN, on behalf of platform
 * support). Persisted into `SupportTicket` (SPEC §6).
 */
export class CreateTicketDto {
  @ApiProperty({ description: 'Salón (tenant) al que pertenece la incidencia.' })
  @IsString()
  @MinLength(1)
  tenantId!: string;

  @ApiProperty({ example: 'No puedo acceder a la agenda' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: 'Al abrir la agenda semanal aparece un error 500.' })
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
