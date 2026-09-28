import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { type Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { type AppConfig } from '../../config/configuration';
import { REFRESH_TOKEN_COOKIE } from '../../common/constants';
import { type AuthenticatedRefresh, type RefreshTokenPayload } from '../auth.types';

/** Reads the refresh token from the httpOnly cookie. */
function refreshCookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
}

/**
 * Validates the refresh JWT and forwards the raw token to the handler so the
 * service can verify it against the hashed, rotating `RefreshToken` record.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshCookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).refreshSecret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload): AuthenticatedRefresh {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    const refreshToken = refreshCookieExtractor(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Falta el token de refresco');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
      refreshToken,
    };
  }
}
