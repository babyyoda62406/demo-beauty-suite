import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload to create a message template for the resolved salon (SPEC §6/§7).
 * `tenantId` is injected server-side and never accepted from the client. The
 * tuple `(tenantId, channel, key)` is unique.
 */
export class CreateMessageTemplateDto {
  @ApiProperty({ enum: MessageChannel, default: MessageChannel.EMAIL, description: 'Canal de envío.' })
  @IsEnum(MessageChannel)
  channel!: MessageChannel;

  @ApiProperty({ example: 'booking_confirmation', description: 'Clave lógica de la plantilla.' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  key!: string;

  @ApiPropertyOptional({ description: 'Asunto (solo relevante para email).' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ description: 'Cuerpo de la plantilla (puede contener placeholders).' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
