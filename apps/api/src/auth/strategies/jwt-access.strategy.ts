import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { type Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { type AppConfig } from '../../config/configuration';
import { ACCESS_TOKEN_COOKIE } from '../../common/constants';
import { getTenantStore } from '../../tenancy/tenant-context';
import { type AccessTokenPayload, type AuthenticatedUser } from '../auth.types';

/** Reads the access token from the httpOnly cookie set at login. */
function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

/**
 * Validates the access JWT (from cookie). On success it also enriches the
 * per-request tenant context with the caller's identity so the Prisma
 * middleware and superadmin bypass work correctly (SPEC §3, §4).
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    // Enrich the request-scoped tenant context with identity.
    const store = getTenantStore();
    if (store) {
      store.userId = payload.sub;
      store.role = payload.role;
      // A superadmin has no tenant of their own; keep whatever the middleware
      // resolved (e.g. an impersonated tenant via X-Tenant).
      if (payload.role !== 'SUPERADMIN' && payload.tenantId) {
        store.tenantId = payload.tenantId;
      }
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    };
  }
}
