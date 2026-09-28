import { type Role } from '@prisma/client';

/** JWT access-token payload. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  role: Role;
  type: 'access';
}

/** JWT refresh-token payload (carries a per-token id for rotation). */
export interface RefreshTokenPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  role: Role;
  jti: string;
  type: 'refresh';
}

/** Shape attached to `request.user` after a successful access-token guard. */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string | null;
  role: Role;
  email: string;
}

/** Shape attached to `request.user` on the refresh route (includes raw token). */
export interface AuthenticatedRefresh extends AuthenticatedUser {
  refreshToken: string;
}
