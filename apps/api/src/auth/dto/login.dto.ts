import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Credentials for password login (SPEC §4). */
export class LoginDto {
  @ApiProperty({ example: 'aurora@estudioaurora.demo' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'contraseña-segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
