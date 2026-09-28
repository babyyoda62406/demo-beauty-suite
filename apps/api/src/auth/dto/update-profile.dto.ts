import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Datos que cada persona puede cambiar de su propia cuenta. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Estudio Aurora' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: '/uploads/foto.jpg', description: 'Foto de perfil.' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;

  @ApiPropertyOptional({ example: '600111222' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
