import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Self-registration payload. El rol NUNCA se acepta del cliente (SPEC §4): se
 * deriva de `intent`, que solo admite dos valores conocidos —
 * `cliente` → CLIENT (portal de reservas) y `alumna` → STUDENT (aula de la
 * academia, RONDA 3). Así se puede abrir el registro del aula sin exponer una
 * vía para auto-asignarse OWNER o cualquier otro rol.
 */
export class RegisterDto {
  @ApiProperty({ example: 'clienta@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'contraseña-segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Laura García' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '+34600111222' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: ['cliente', 'alumna'],
    default: 'cliente',
    description:
      'Para qué se registra: `cliente` (portal de reservas) o `alumna` (aula de la academia). ' +
      'Determina el rol; no se acepta el rol directamente.',
  })
  @IsOptional()
  @IsIn(['cliente', 'alumna'])
  intent?: 'cliente' | 'alumna';

  @ApiPropertyOptional({
    description: 'Solo para `alumna`: qué le interesa. Se guarda en el CRM de la academia.',
  })
  @IsOptional()
  @IsString()
  message?: string;
}
