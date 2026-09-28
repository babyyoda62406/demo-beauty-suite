import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PhotoKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to attach a photo to a client's file: before/after/design shots
 * (SPEC §6 `ClientPhoto`). Optionally linked to a booking of the same client.
 */
export class CreateClientPhotoDto {
  @ApiProperty({ example: 'https://cdn.example.com/clientas/lucia/after-01.jpg', maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ enum: PhotoKind, default: PhotoKind.DESIGN })
  @IsOptional()
  @IsEnum(PhotoKind)
  kind?: PhotoKind;

  @ApiPropertyOptional({ description: 'Id de la cita asociada (de la misma clienta).' })
  @IsOptional()
  @IsString()
  bookingId?: string;
}
