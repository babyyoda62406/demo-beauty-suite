import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Cambio de contraseña de la propia cuenta. */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual, para confirmar que es quien dice ser.' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ description: 'Contraseña nueva (mínimo 8 caracteres).' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  newPassword!: string;
}
