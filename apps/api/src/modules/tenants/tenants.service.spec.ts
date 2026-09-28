import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Tenant } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { TenantsService } from './tenants.service';

/** In-memory Prisma doubles; deeper flows are covered by e2e tests. */
type PrismaMock = {
  tenant: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  moduleActivation: { upsert: jest.Mock; findMany: jest.Mock };
  setting: { upsert: jest.Mock; findMany: jest.Mock };
};

function buildTenant(overrides: Partial<Tenant> = {}): Tenant {
  const now = new Date();
  return {
    id: 'tenant_1',
    slug: 'aurora',
    name: 'Estudio Aurora',
    legalName: null,
    brand: {},
    domain: null,
    planKey: 'STARTER',
    status: 'TRIAL',
    timezone: 'Europe/Madrid',
    locale: 'es-ES',
    currency: 'EUR',
    email: null,
    phone: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      moduleActivation: { upsert: jest.fn(), findMany: jest.fn() },
      setting: { upsert: jest.fn(), findMany: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [TenantsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(TenantsService);
  });

  describe('create', () => {
    it('rechaza un slug ya existente', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'other' });

      await expect(
        service.create({ slug: 'aurora', name: 'Estudio Aurora' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });

    it('crea el salón cuando el slug está libre', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue(buildTenant());

      const result = await service.create({ slug: 'Aurora', name: 'Estudio Aurora' });

      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'aurora' }) }),
      );
      expect(result.slug).toBe('aurora');
    });
  });

  describe('updateBrand', () => {
    it('fusiona el patch con el branding existente', async () => {
      prisma.tenant.findUnique.mockResolvedValue(
        buildTenant({ brand: { colors: { 'brand-500': '#000' }, logoUrl: 'old.png' } }),
      );
      prisma.tenant.update.mockImplementation(({ data }: { data: { brand: unknown } }) =>
        buildTenant({ brand: data.brand as Tenant['brand'] }),
      );

      await service.updateBrand('tenant_1', { logoUrl: 'new.png' });

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant_1' },
          data: {
            brand: { colors: { 'brand-500': '#000' }, logoUrl: 'new.png' },
          },
        }),
      );
    });
  });

  describe('getPublicBranding', () => {
    it('lanza NotFound si el salón no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getPublicBranding('inexistente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lanza NotFound si el salón está suspendido', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        slug: 'aurora',
        name: 'Estudio Aurora',
        brand: {},
        locale: 'es-ES',
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        status: 'SUSPENDED',
      });

      await expect(service.getPublicBranding('aurora')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devuelve el branding público de un salón activo', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        slug: 'aurora',
        name: 'Estudio Aurora',
        brand: { colors: { 'brand-500': '#D6157F' } },
        locale: 'es-ES',
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        status: 'ACTIVE',
      });

      const result = await service.getPublicBranding('aurora');

      expect(result).toEqual({
        slug: 'aurora',
        name: 'Estudio Aurora',
        brand: { colors: { 'brand-500': '#D6157F' } },
        locale: 'es-ES',
        currency: 'EUR',
        timezone: 'Europe/Madrid',
      });
    });
  });
});
