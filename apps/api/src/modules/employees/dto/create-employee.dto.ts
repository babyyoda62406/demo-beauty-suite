import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Hex colour (agenda) validation, e.g. `#D6157F`. */
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Payload to create an employee (professional). `tenantId` is injected
 * server-side from the resolved tenant and never accepted from the client
 * (SPEC §3/§6). Money is in integer cents; `commissionRate` is in basis points
 * (e.g. `1500` = 15%). Commissions are computed by the commissions domain and
 * are not settable here.
 */
export class CreateEmployeeDto {
  @ApiProperty({ example: 'Estudio Aurora', minLength: 2, maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Nail artist', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: '+34600111222', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'aurora@example.com', maxLength: 160 })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/team/aurora.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;

  @ApiPropertyOptional({ example: '#D6157F', description: 'Color de agenda (hex).' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'color debe ser un valor hexadecimal (#RGB o #RRGGBB)' })
  color?: string;

  @ApiPropertyOptional({
    example: 1500,
    minimum: 0,
    maximum: 10000,
    description: 'Comisión en puntos básicos (1500 = 15%).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  commissionRate?: number;

  @ApiPropertyOptional({ example: 120000, minimum: 0, description: 'Salario mensual en céntimos.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Fecha de alta (ISO-8601, UTC).' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ default: true, description: 'Empleado activo.' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Reservable en la agenda pública.' })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  bookable?: boolean;

  @ApiPropertyOptional({ example: 'Especialista en uñas acrílicas.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: 'Acrílico, gel, nail art', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialties?: string;

  @ApiPropertyOptional({ description: 'Usuario de acceso vinculado (opcional).' })
  @IsOptional()
  @IsString()
  userId?: string;
}
