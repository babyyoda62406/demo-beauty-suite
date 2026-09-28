import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Input for `POST /ai/analyze-hand`. Receives the URL of an uploaded photo; the
 * heuristic returns deterministic observations (shape/length/condition) until
 * the real vision provider is wired. `tenantId` is injected server-side.
 */
export class AnalyzeHandDto {
  @ApiProperty({ example: 'https://cdn.example.com/hands/abc.jpg', description: 'URL de la foto.' })
  @IsUrl({ require_protocol: true }, { message: 'photoUrl debe ser una URL válida' })
  @MaxLength(2048)
  photoUrl!: string;

  @ApiPropertyOptional({ description: 'Id de la clienta (del mismo salón).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;
}
