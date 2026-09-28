import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

import { AI_SEASONS, type AiSeason } from './recommend-designs.dto';

/**
 * Input for `POST /ai/suggest-colors`. Produces a deterministic colour palette
 * biased by season, skin tone and/or a base colour. `tenantId` is injected
 * server-side (SPEC §3).
 */
export class SuggestColorsDto {
  @ApiPropertyOptional({ description: 'Id de la clienta (del mismo salón).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @ApiPropertyOptional({ example: '#C71585', description: 'Color base en formato hex (#RRGGBB).' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'baseColor debe ser un hex #RRGGBB' })
  baseColor?: string;

  @ApiPropertyOptional({ description: 'Tono de piel (p.ej. "fría", "cálida", "neutra").' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  skinTone?: string;

  @ApiPropertyOptional({ enum: AI_SEASONS, description: 'Temporada de referencia.' })
  @IsOptional()
  @IsIn(AI_SEASONS)
  season?: AiSeason;

  @ApiPropertyOptional({ minimum: 2, maximum: 8, default: 5, description: 'Nº de colores.' })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(8)
  count?: number;
}
