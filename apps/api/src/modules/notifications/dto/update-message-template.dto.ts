import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Partial update of a message template (SPEC §7). */
export class UpdateMessageTemplateDto {
  @ApiPropertyOptional({ enum: MessageChannel, description: 'Canal de envío.' })
  @IsOptional()
  @IsEnum(MessageChannel)
  channel?: MessageChannel;

  @ApiPropertyOptional({ description: 'Clave lógica de la plantilla.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  key?: string;

  @ApiPropertyOptional({ description: 'Asunto (solo relevante para email).' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Cuerpo de la plantilla.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body?: string;
}
