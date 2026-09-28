import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanKey, TenantStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Lowercase slug: alphanumeric words separated by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Partial update of a tenant's core attributes (SUPERADMIN). Branding is patched
 * through the dedicated `/tenants/:id/brand` endpoint. A changed `slug`/`domain`
 * is re-checked for uniqueness in the service.
 */
export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Nuevo slug único (marca blanca).' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(SLUG_PATTERN, {
    message: 'slug debe ser minúsculas, números y guiones (p.ej. "mi-salon")',
  })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ enum: PlanKey })
  @IsOptional()
  @IsEnum(PlanKey)
  planKey?: PlanKey;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ description: 'Código ISO de moneda.' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Dominio propio mapeado.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
