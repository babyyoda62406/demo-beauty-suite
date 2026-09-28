import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Payload to reset a user's password. The new secret is hashed with argon2id
 * and every active session for the user is revoked (SPEC §4, §5).
 */
export class ResetPasswordDto {
  @ApiProperty({ example: 'nueva-contraseña-segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
