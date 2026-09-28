import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanKey, TenantStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { BrandDto } from './brand.dto';

/** Lowercase slug: alphanumeric words separated by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Payload to create a salon/tenant (SUPERADMIN, SPEC §3/§6). `slug` must be
 * unique platform-wide (enforced in the service and by the DB constraint).
 */
export class CreateTenantDto {
  @ApiProperty({ example: 'aurora', description: 'Identificador único de marca blanca (slug).' })
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(SLUG_PATTERN, {
    message: 'slug debe ser minúsculas, números y guiones (p.ej. "mi-salon")',
  })
  slug!: string;

  @ApiProperty({ example: 'Estudio Aurora', description: 'Nombre comercial del salón.' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ description: 'Razón social / nombre legal.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ enum: PlanKey, default: PlanKey.STARTER })
  @IsOptional()
  @IsEnum(PlanKey)
  planKey?: PlanKey;

  @ApiPropertyOptional({ enum: TenantStatus, default: TenantStatus.TRIAL })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ example: 'Europe/Madrid' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'es-ES' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ example: 'EUR', description: 'Código ISO de moneda.' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Dominio propio mapeado (marca blanca).' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ description: 'Email de contacto del salón.' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto del salón.' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ type: BrandDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandDto)
  brand?: BrandDto;
}
