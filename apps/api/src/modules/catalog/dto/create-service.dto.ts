import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Payload to create a catalogue service. Money is stored as an integer amount
 * of currency minor units (cents); durations are whole minutes (SPEC §6).
 * `tenantId` is injected server-side and never accepted from the client.
 */
export class CreateServiceDto {
  @ApiProperty({ example: 'Manicura semipermanente', minLength: 2, maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Incluye retirada y diseño básico.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'Color, brillo y elegancia para cada día.',
    maxLength: 200,
    description: 'Frase llamativa corta que se muestra en la tarjeta del servicio.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Id de la categoría a la que pertenece (del mismo salón).',
  })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiProperty({ example: 60, minimum: 1, maximum: 1440, description: 'Duración en minutos.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMin!: number;

  @ApiProperty({ example: 2500, minimum: 0, description: 'Precio en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Si el servicio está visible/reservable.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/servicios/manicura.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;
}
