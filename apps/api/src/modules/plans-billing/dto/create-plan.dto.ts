import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanKey } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

/**
 * Creates a platform {@link PlanKey}-keyed plan (SPEC §6). Restricted to
 * `SUPERADMIN`. Prices are stored as integer cents; `features`/`moduleFlags`
 * are free-form JSON maps consumed by tenant provisioning and the frontend.
 */
export class CreatePlanDto {
  @ApiProperty({ enum: PlanKey, description: 'Clave única del plan (identificador).' })
  @IsEnum(PlanKey)
  key!: PlanKey;

  @ApiProperty({ description: 'Nombre comercial del plan.' })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ minimum: 0, description: 'Precio mensual en céntimos (Int).' })
  @IsInt()
  @Min(0)
  priceMonthly!: number;

  @ApiPropertyOptional({ default: 'EUR', description: 'Moneda ISO-4217 (3 letras).' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Características del plan (JSON libre).' })
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Flags de módulos activados por el plan (JSON libre).' })
  @IsOptional()
  @IsObject()
  moduleFlags?: Record<string, unknown>;
}
