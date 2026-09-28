import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Adds a client to the waitlist for a service on a desired date. The client is
 * created/associated by phone within the resolved tenant (public-friendly).
 */
export class CreateWaitlistDto {
  @ApiProperty({ description: 'Id del servicio deseado.' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ example: '2026-08-15T00:00:00.000Z', description: 'Fecha deseada (ISO-8601 UTC).' })
  @IsISO8601()
  desiredDate!: string;

  @ApiProperty({ example: 'Laura García' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+34600111222' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({ example: 'laura@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
