import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Activates or deactivates a business module for a tenant (SUPERADMIN).
 * Upserted into `ModuleActivation` keyed by `(tenantId, moduleKey)` (SPEC §6).
 */
export class ModuleActivationDto {
  @ApiProperty({ example: 'academy', description: 'Clave del módulo de negocio (SPEC §7).' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'moduleKey debe ser minúsculas, números y guiones',
  })
  moduleKey!: string;

  @ApiPropertyOptional({ default: true, description: 'true para activar, false para desactivar.' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
