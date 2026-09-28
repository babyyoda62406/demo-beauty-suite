import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Payload to create a testimonial. Testimonials require staff approval before
 * they surface on the public site (`approved`, SPEC §6). `tenantId` is injected
 * server-side and never accepted from the client.
 */
export class CreateTestimonialDto {
  @ApiProperty({ example: 'María López', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  clientName!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Valoración de 1 a 5.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Un trato excelente y un resultado precioso.', minLength: 2, maxLength: 2000 })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  text!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/maria.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'Si está aprobado para la web pública.' })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}
