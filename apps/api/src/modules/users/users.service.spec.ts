import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';

import { PrismaService } from '../../prisma/prisma.service';

import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { type PublicUser, UsersService } from './users.service';

/** In-memory Prisma doubles; deeper flows are covered by e2e. */
type PrismaMock = {
  user: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  refreshToken: { updateMany: jest.Mock };
  $transaction: jest.Mock;
};

const TENANT = 'tenant_1';

function buildPublicUser(overrides: Partial<PublicUser> = {}): PublicUser {
  const now = new Date();
  return {
    id: 'user_1',
    tenantId: TENANT,
    email: 'staff@example.com',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    name: 'Staff',
    phone: null,
    photoUrl: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('rechaza un email ya existente en el mismo tenant', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(TENANT, { email: 'Staff@Example.com', password: 'password123', name: 'Staff' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea el usuario con email normalizado, tenant y rol por defecto EMPLOYEE', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(buildPublicUser());

      const result = await service.create(TENANT, {
        email: 'Staff@Example.com',
        password: 'password123',
        name: 'Staff',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            email: 'staff@example.com',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
          }),
        }),
      );
      // passwordHash must never be part of the returned projection.
      expect(result).not.toHaveProperty('passwordHash');
      // The stored hash is a real argon2id hash, not the plaintext.
      const stored = prisma.user.create.mock.calls[0][0].data.passwordHash as string;
      expect(stored).not.toBe('password123');
      expect(await argon2.verify(stored, 'password123')).toBe(true);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el usuario no pertenece al tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT, 'user_x')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user_x', tenantId: TENANT } }),
      );
    });
  });

  describe('findAll', () => {
    it('filtra por tenant y devuelve el envelope paginado', async () => {
      prisma.user.findMany.mockResolvedValue([buildPublicUser()]);
      prisma.user.count.mockResolvedValue(1);

      const query = Object.assign(new ListUsersQueryDto(), { page: 1, pageSize: 20, sortOrder: 'desc' });
      const result = await service.findAll(TENANT, query);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
      );
      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('deactivate', () => {
    it('suspende al usuario y revoca sus sesiones', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 'user_1' }) // ensureExists
        .mockResolvedValueOnce(buildPublicUser({ status: 'SUSPENDED' })); // findOne after update

      const result = await service.deactivate(TENANT, 'user_1');

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user_1', tenantId: TENANT }, data: { status: 'SUSPENDED' } }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user_1', revokedAt: null } }),
      );
      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si no se elimina ninguna fila del tenant', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(TENANT, 'user_x')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: 'user_x', tenantId: TENANT } });
    });
  });
});
