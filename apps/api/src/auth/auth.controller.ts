import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type CookieOptions, type Request, type Response } from 'express';

import { type AppConfig } from '../config/configuration';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../common/constants';
import { TenantId } from '../tenancy/decorators';

import { type AuthenticatedRefresh, type AuthenticatedUser } from './auth.types';
import {
  AuthService,
  type IssuedTokens,
  type PublicProfile,
  type SessionMeta,
} from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Authentication endpoints. Tokens are delivered as httpOnly, `Secure`,
 * `SameSite=Lax` cookies (SPEC §4). `/auth/*` carries a reinforced rate limit
 * (SPEC §5). Login/register/refresh are `@Public()`; logout requires a session.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de cliente (rol CLIENT) en el salón resuelto.' })
  @ApiOkResponse({ type: TokenResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @TenantId() tenantId: string | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const tokens = await this.authService.register(dto, tenantId, this.sessionMeta(req));
    return this.respondWithCookies(res, tokens);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicio de sesión con email y contraseña.' })
  @ApiOkResponse({ type: TokenResponseDto })
  async login(
    @Body() dto: LoginDto,
    @TenantId() tenantId: string | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const tokens = await this.authService.login(dto, tenantId, this.sessionMeta(req));
    return this.respondWithCookies(res, tokens);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rota el refresh token y renueva la sesión.' })
  @ApiOkResponse({ type: TokenResponseDto })
  async refresh(
    @CurrentUser() user: AuthenticatedRefresh,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const tokens = await this.authService.refresh(user, this.sessionMeta(req));
    return this.respondWithCookies(res, tokens);
  }

  /**
   * Quién ha iniciado sesión. La cookie es httpOnly, así que el navegador no
   * puede leer el token: sin esto la interfaz no sabe ni el nombre de quien
   * entra (el avatar de la cabecera mostraba siempre las mismas iniciales).
   */
  @Get('profile')
  @ApiOperation({ summary: 'Datos de la cuenta que tiene la sesión abierta.' })
  profile(@CurrentUser() user: AuthenticatedUser): Promise<PublicProfile> {
    return this.authService.getProfile(user.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Actualiza el nombre, el teléfono o la foto de la propia cuenta.' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicProfile> {
    return this.authService.updateProfile(user.userId, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambia la contraseña propia (pide la actual).' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    return this.authService.changePassword(user.userId, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierra la sesión actual y revoca el refresh token.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    const refreshToken = cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
    await this.authService.logout(user.userId, refreshToken);
    this.clearAuthCookies(res);
    return { success: true };
  }

  // --- helpers ---------------------------------------------------------------

  private sessionMeta(req: Request): SessionMeta {
    const userAgent = req.headers['user-agent'];
    return {
      userAgent: typeof userAgent === 'string' ? userAgent : null,
      ip: req.ip ?? null,
    };
  }

  private respondWithCookies(res: Response, tokens: IssuedTokens): TokenResponseDto {
    this.setAuthCookies(res, tokens);
    return {
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
      refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
      user: tokens.user,
    };
  }

  private setAuthCookies(res: Response, tokens: IssuedTokens): void {
    res.cookie(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      this.cookieOptions(tokens.accessTokenExpiresIn * 1000),
    );
    // El refresh se emite con path '/' (heredado de cookieOptions) para que el
    // navegador lo adjunte al BFF de Next (POST /api/auth/refresh). Restringirlo
    // a '/api/v1/auth' lo hacía inalcanzable: el navegador nunca habla con esa
    // ruta, así que el refresco era imposible. Sigue httpOnly + Secure(prod) +
    // SameSite=Lax.
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      this.cookieOptions(tokens.refreshTokenExpiresIn * 1000),
    );
  }

  private clearAuthCookies(res: Response): void {
    const base = this.cookieOptions(0);
    res.clearCookie(ACCESS_TOKEN_COOKIE, base);
    // Mismo path ('/') que en setAuthCookies o el navegador no borraría la cookie.
    res.clearCookie(REFRESH_TOKEN_COOKIE, base);
  }

  private cookieOptions(maxAgeMs: number): CookieOptions {
    const isProduction = this.config.get('isProduction', { infer: true });
    const domain = this.config.get('cookie', { infer: true }).domain;
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      domain,
      path: '/',
      maxAge: maxAgeMs,
    };
  }
}
