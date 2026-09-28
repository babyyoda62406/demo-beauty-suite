import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, type User } from '@prisma/client';
import * as argon2 from 'argon2';

import { type AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';

import {
  type AccessTokenPayload,
  type AuthenticatedRefresh,
  type RefreshTokenPayload,
} from './auth.types';
import { type ChangePasswordDto } from './dto/change-password.dto';
import { type LoginDto } from './dto/login.dto';
import { type RegisterDto } from './dto/register.dto';
import { AuthUserDto } from './dto/token-response.dto';
import { type UpdateProfileDto } from './dto/update-profile.dto';

/** Proyección de la cuenta que se devuelve a la interfaz. */
export interface PublicProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  photoUrl: string | null;
}

/** Client metadata captured for issued refresh tokens (audit / revocation). */
export interface SessionMeta {
  userAgent: string | null;
  ip: string | null;
}

/** Freshly minted token pair plus the public user projection. */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: AuthUserDto;
}

/**
 * Authentication service: registration, password login, refresh-token rotation
 * with hashed persistence, logout/revocation and credential validation.
 * Passwords and refresh tokens are hashed with argon2id (SPEC §4, §5).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Registers a new `CLIENT` scoped to the resolved tenant and logs them in. */
  async register(
    dto: RegisterDto,
    tenantId: string | null,
    meta: SessionMeta,
  ): Promise<IssuedTokens> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findFirst({
      where: { email, tenantId: tenantId ?? null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    // El rol se deriva del `intent` (valores cerrados en el DTO), nunca se
    // toma del cuerpo de la petición: registrarse en el aula no debe ser una
    // vía para auto-asignarse un rol con permisos del salón.
    const isStudent = dto.intent === 'alumna';
    const passwordHash = await this.hashSecret(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
        phone: dto.phone ?? null,
        role: isStudent ? 'STUDENT' : 'CLIENT',
        tenantId: tenantId ?? null,
      },
    });

    // Al registrarse una alumna se crea su ficha en el CRM de la academia, que
    // permite al salón saber quién se interesa por sus cursos.
    if (isStudent && tenantId) {
      await this.prisma.academyLead
        .upsert({
          where: { tenantId_email: { tenantId, email } },
          update: { userId: user.id, name: user.name, phone: user.phone, source: 'registro' },
          create: {
            tenantId,
            userId: user.id,
            name: user.name,
            email,
            phone: user.phone,
            message: dto.message ?? null,
            source: 'registro',
          },
        })
        .catch((error: unknown) => {
          // El CRM es secundario: si falla, no se tumba un registro válido.
          this.logger.warn(`No se pudo crear la ficha CRM de ${user.id}: ${String(error)}`);
        });
    }

    // Una clienta necesita su ficha en el CRM: es lo que da acceso a su portal
    // (citas, fidelización, bonos, tarjetas regalo). Sin ella, todas esas
    // pantallas responden «No hay una ficha de clienta asociada a tu cuenta».
    // Si la clienta ya venía al salón y Aurora la tenía dada de alta, se VINCULA
    // esa ficha en vez de duplicarla, para que conserve su historial.
    if (!isStudent && tenantId) {
      await this.linkOrCreateClientRecord(tenantId, user).catch((error: unknown) => {
        this.logger.error(`No se pudo crear la ficha de clienta de ${user.id}: ${String(error)}`);
      });
    }

    this.logger.log(`Nuevo registro (${isStudent ? 'alumna' : 'cliente'}): ${user.id}`);
    return this.issueTokens(user, meta);
  }

  /**
   * Vincula la cuenta con su ficha de clienta, creándola si no existe.
   *
   * Es idempotente a propósito: se usa tanto en el registro como para reparar
   * cuentas antiguas que se quedaron sin ficha.
   */
  async linkOrCreateClientRecord(tenantId: string, user: User): Promise<void> {
    const yaVinculada = await this.prisma.client.findFirst({
      where: { tenantId, userId: user.id },
      select: { id: true },
    });
    if (yaVinculada) return;

    // Una ficha suya que Aurora ya tuviera, localizada por correo o teléfono.
    const previa = await this.prisma.client.findFirst({
      where: {
        tenantId,
        userId: null,
        OR: [
          ...(user.email ? [{ email: user.email }] : []),
          ...(user.phone ? [{ phone: user.phone }] : []),
        ],
      },
      select: { id: true },
    });

    if (previa) {
      await this.prisma.client.update({ where: { id: previa.id }, data: { userId: user.id } });
      return;
    }

    await this.prisma.client.create({
      data: {
        tenantId,
        userId: user.id,
        name: user.name,
        // `phone` es obligatorio en el modelo; el registro no siempre lo pide.
        phone: user.phone ?? '',
        email: user.email,
      },
    });
  }

  /** Datos públicos de la cuenta con la sesión abierta (para la interfaz). */
  async getProfile(userId: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, phone: true, photoUrl: true },
    });
    if (!user) {
      throw new UnauthorizedException('Sesión no válida');
    }
    return user;
  }

  /** Cada persona edita su nombre, su teléfono y su foto; nada más. */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicProfile> {
    const data: Prisma.UserUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl || null;

    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getProfile(userId);
  }

  /**
   * Cambio de contraseña propio.
   *
   * Se exige la actual aunque haya sesión: si alguien deja la sesión abierta en
   * un dispositivo, no debería poder quedarse con la cuenta. Al cambiarla se
   * revocan los refresh tokens, de modo que las demás sesiones se caen.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: true }> {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Sesión no válida');

    const valida = await argon2.verify(user.passwordHash, dto.currentPassword).catch(() => false);
    if (!valida) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const passwordHash = await this.hashSecret(dto.newPassword);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    this.logger.log(`Contraseña cambiada por su propietario: ${user.id}`);
    return { success: true };
  }

  /** Validates credentials and issues a token pair. */
  async login(dto: LoginDto, tenantId: string | null, meta: SessionMeta): Promise<IssuedTokens> {
    const user = await this.validateUser(dto.email, dto.password, tenantId);
    return this.issueTokens(user, meta);
  }

  /**
   * Looks up a user by email within the resolved tenant and verifies the
   * password. Returns the user on success; throws `UnauthorizedException`
   * otherwise. Uses a constant error to avoid leaking which factor failed.
   */
  async validateUser(email: string, password: string, tenantId: string | null): Promise<User> {
    const normalized = email.toLowerCase().trim();
    let user = await this.prisma.user.findFirst({
      where: { email: normalized, tenantId: tenantId ?? null },
    });

    // Platform staff (SUPERADMIN) have no tenant. Let them sign in on any host
    // by falling back to a tenant-less SUPERADMIN when the tenant lookup misses.
    if (!user && tenantId) {
      user = await this.prisma.user.findFirst({
        where: { email: normalized, tenantId: null, role: Role.SUPERADMIN },
      });
    }

    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  /**
   * Rotates a refresh token: verifies the presented token against the stored
   * hashes, revokes the matched record, and issues a fresh pair. If no active
   * token matches (possible reuse of a rotated/stolen token) every session for
   * the user is revoked as a safety measure.
   */
  async refresh(auth: AuthenticatedRefresh, meta: SessionMeta): Promise<IssuedTokens> {
    const active = await this.prisma.refreshToken.findMany({
      where: { userId: auth.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    let matchedId: string | null = null;
    for (const record of active) {
      if (await argon2.verify(record.tokenHash, auth.refreshToken)) {
        matchedId = record.id;
        break;
      }
    }

    if (!matchedId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: auth.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(`Refresh token no válido para el usuario ${auth.userId}; sesiones revocadas`);
      throw new UnauthorizedException('Sesión no válida');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchedId },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.issueTokens(user, meta);
  }

  /** Revokes the presented refresh token (or all sessions if none is given). */
  async logout(userId: string, refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }

    const active = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
    });
    for (const record of active) {
      if (await argon2.verify(record.tokenHash, refreshToken)) {
        await this.prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
  }

  /** Signs an access/refresh pair and persists the hashed refresh token. */
  private async issueTokens(user: User, meta: SessionMeta): Promise<IssuedTokens> {
    const jwtConfig = this.config.get('jwt', { infer: true });
    const jti = randomUUID();
    const role: Role = user.role;

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role,
      jti,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: jwtConfig.accessSecret,
        expiresIn: jwtConfig.accessTtl,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: jwtConfig.refreshSecret,
        expiresIn: jwtConfig.refreshTtl,
      }),
    ]);

    const tokenHash = await this.hashSecret(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + jwtConfig.refreshTtl * 1000),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: jwtConfig.accessTtl,
      refreshTokenExpiresIn: jwtConfig.refreshTtl,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  private hashSecret(secret: string): Promise<string> {
    return argon2.hash(secret, { type: argon2.argon2id });
  }
}
