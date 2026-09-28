import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Payload to create a CRM client (clienta) record. `tenantId` is injected
 * server-side from the resolved tenant and never accepted from the client
 * (SPEC §3/§6). Loyalty points are owned by the loyalty domain and are not
 * settable here.
 */
export class CreateClientDto {
  @ApiProperty({ example: 'Lucía Fernández', minLength: 2, maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: '+34600111222', minLength: 3, maxLength: 32 })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone!: string;

  @ApiPropertyOptional({ example: 'lucia@example.com', maxLength: 160 })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: '@lucia.nails', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  instagram?: string;

  @ApiPropertyOptional({ example: '1994-05-21', description: 'Fecha de nacimiento (ISO-8601, UTC).' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/clientas/lucia.jpg', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'Alergia al níquel', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @ApiPropertyOptional({ example: 'Prefiere diseños minimalistas', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  preferences?: string;

  @ApiPropertyOptional({ example: 'Nude, rosa palo', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  favoriteColors?: string;

  @ApiPropertyOptional({ example: 'Notas privadas del salón', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
