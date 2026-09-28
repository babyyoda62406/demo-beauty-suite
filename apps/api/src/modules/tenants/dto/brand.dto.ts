import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * White-label branding payload stored in `Tenant.brand` (Json, SPEC §3).
 * Free-form nested maps (colors/fonts/socials) are validated only as objects;
 * the frontend reads them to paint the tenant's theme.
 */
export class BrandDto {
  @ApiPropertyOptional({
    description: 'Mapa de colores de marca, p.ej. { "brand-500": "#D6157F" }.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  colors?: Record<string, string>;

  @ApiPropertyOptional({ description: 'URL del logotipo del salón.' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Tipografías de marca, p.ej. { "display": "Dancing Script" }.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  fonts?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Redes sociales, p.ej. { "instagram": "https://..." }.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  socials?: Record<string, string>;
}
