import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Slug: lowercase words separated by single hyphens (URL-safe). */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Payload to create a blog post. `slug` is unique per tenant and drives the
 * public URL; `contentMdx` holds the MDX body (SPEC §6). `tenantId` and
 * `authorId` are injected server-side and never accepted from the client.
 */
export class CreateBlogPostDto {
  @ApiProperty({ example: 'tendencias-unas-primavera', minLength: 2, maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(SLUG_REGEX, {
    message: 'slug solo admite minúsculas, números y guiones simples',
  })
  slug!: string;

  @ApiProperty({ example: 'Tendencias de uñas para primavera', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Los diseños que marcarán la temporada.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/blog/portada.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverUrl?: string;

  @ApiProperty({ example: '# Título\n\nCuerpo del artículo en **MDX**.', maxLength: 100_000 })
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  contentMdx!: string;

  @ApiPropertyOptional({ type: [String], example: ['tendencias', 'primavera'], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false, default: false, description: 'Si el artículo está publicado.' })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({
    example: '2026-04-01T09:00:00.000Z',
    description: 'Fecha de publicación (UTC). Si se omite y se publica, se usa el momento actual.',
  })
  @IsOptional()
  @IsISO8601()
  publishedAt?: string;
}
