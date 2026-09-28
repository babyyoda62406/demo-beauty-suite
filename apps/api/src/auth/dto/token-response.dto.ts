import { ApiProperty } from '@nestjs/swagger';
import { type Role } from '@prisma/client';

/** Public user projection returned alongside auth responses. */
export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['SUPERADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT'] })
  role!: Role;

  @ApiProperty({ nullable: true, type: String })
  tenantId!: string | null;
}

/**
 * Response body for login/register/refresh. Tokens themselves are delivered as
 * httpOnly cookies; the body exposes only the expiry hints and the user.
 */
export class TokenResponseDto {
  @ApiProperty({ description: 'TTL del access token en segundos.' })
  accessTokenExpiresIn!: number;

  @ApiProperty({ description: 'TTL del refresh token en segundos.' })
  refreshTokenExpiresIn!: number;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
