import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Input for `POST /ai/inspiration`. Generates deterministic text-to-image
 * prompts (and placeholder image URLs) for a moodboard. Real image generation
 * is deferred to the external provider. `tenantId` is injected server-side.
 */
export class InspirationDto {
  @ApiPropertyOptional({ description: 'Id de la clienta (del mismo salón).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @ApiPropertyOptional({ description: 'Tema o concepto (p.ej. "bodas en playa").' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  theme?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Palabras clave adicionales para el moodboard.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  keywords?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 8, default: 4, description: 'Nº de prompts/imágenes.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  count?: number;
}
