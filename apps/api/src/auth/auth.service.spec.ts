import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { type User } from '@prisma/client';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';

import { AuthService, type SessionMeta } from './auth.service';

/** In-memory doubles kept deliberately small; deep flows are covered in e2e. */
type PrismaMock = {
  user: { findFirst: jest.Mock; create: jest.Mock; findUnique: jest.Mock };
  refreshToken: { create: jest.Mock; findMany: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
};

const META: SessionMeta = { userAgent: 'jest', ip: '127.0.0.1' };

const JWT_CONFIG = {
  accessSecret: 'access-secret-access-secret',
  refreshSecret: 'refresh-secret-refresh-secret',
  accessTtl: 900,
  refreshTtl: 604800,
};

function buildUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: 'user_1',
    tenantId: 'tenant_1',
    email: 'clienta@example.com',
    passwordHash: 'hash',
    role: 'CLIENT',
    status: 'ACTIVE',
    name: 'Clienta',
    phone: null,
    photoUrl: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      user: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_1' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(JWT_CONFIG) } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('rechaza un email ya existente en el mismo tenant', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register(
          { email: 'clienta@example.com', password: 'password123', name: 'Clienta' },
          'tenant_1',
          META,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea el usuario con rol CLIENT y emite tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(buildUser());

      const result = await service.register(
        { email: 'clienta@example.com', password: 'password123', name: 'Clienta' },
        'tenant_1',
        META,
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: 'CLIENT', tenantId: 'tenant_1' }) }),
      );
      expect(result.user.role).toBe('CLIENT');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateUser', () => {
    it('lanza UnauthorizedException con contraseña incorrecta', async () => {
      const passwordHash = await argon2.hash('correcta', { type: argon2.argon2id });
      prisma.user.findFirst.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        service.validateUser('clienta@example.com', 'incorrecta', 'tenant_1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('devuelve el usuario con credenciales válidas', async () => {
      const passwordHash = await argon2.hash('correcta', { type: argon2.argon2id });
      prisma.user.findFirst.mockResolvedValue(buildUser({ passwordHash }));

      const user = await service.validateUser('clienta@example.com', 'correcta', 'tenant_1');
      expect(user.id).toBe('user_1');
    });
  });
});
