import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to set/clear the private salon notes of a client. Sending `null` or
 * omitting the field clears the notes.
 */
export class UpdateNotesDto {
  @ApiPropertyOptional({
    example: 'Prefiere cita por la mañana. Cliente VIP.',
    nullable: true,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
