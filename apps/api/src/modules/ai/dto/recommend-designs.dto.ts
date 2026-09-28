import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Seasons used to bias seasonal design/colour suggestions. */
export const AI_SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as const;
export type AiSeason = (typeof AI_SEASONS)[number];

/**
 * Input for `POST /ai/recommend-designs`. All fields are optional so the
 * heuristic can fall back to seasonal defaults; `tenantId` is always injected
 * server-side and never accepted from the client (SPEC §3).
 */
export class RecommendDesignsDto {
  @ApiPropertyOptional({ description: 'Id de la clienta (del mismo salón), para personalizar.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @ApiPropertyOptional({ enum: AI_SEASONS, description: 'Temporada de referencia.' })
  @IsOptional()
  @IsIn(AI_SEASONS)
  season?: AiSeason;

  @ApiPropertyOptional({
    type: [String],
    description: 'Preferencias/estilos de la clienta (p.ej. "minimalista", "glitter").',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  preferences?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 12, default: 5, description: 'Nº de sugerencias.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  limit?: number;
}
