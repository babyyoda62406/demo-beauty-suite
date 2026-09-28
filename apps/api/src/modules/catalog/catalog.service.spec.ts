import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Service, type ServiceCategory } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CatalogService } from './catalog.service';

/** Minimal in-memory Prisma double; deep flows are covered in e2e. */
type PrismaMock = {
  serviceCategory: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  service: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const TENANT = 'tenant_1';

function buildCategory(overrides: Partial<ServiceCategory> = {}): ServiceCategory {
  const now = new Date();
  return {
    id: 'cat_1',
    tenantId: TENANT,
    name: 'Manicura',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildService(overrides: Partial<Service> = {}): Service {
  const now = new Date();
  return {
    id: 'svc_1',
    tenantId: TENANT,
    categoryId: null,
    name: 'Semipermanente',
    description: null,
    durationMin: 60,
    price: 2500,
    currency: 'EUR',
    active: true,
    imageUrl: null,
    tagline: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('CatalogService', () => {
  let service: CatalogService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      serviceCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      service: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [CatalogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(CatalogService);
  });

  describe('createCategory', () => {
    it('crea la categoría con el tenant resuelto', async () => {
      prisma.serviceCategory.create.mockResolvedValue(buildCategory());

      await service.createCategory(TENANT, { name: '  Manicura  ', sortOrder: 3 });

      expect(prisma.serviceCategory.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT, name: 'Manicura', sortOrder: 3 },
      });
    });
  });

  describe('createService', () => {
    it('rechaza una categoría de otro salón', async () => {
      prisma.serviceCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.createService(TENANT, {
          name: 'Pedicura',
          durationMin: 45,
          price: 3000,
          categoryId: 'foreign_cat',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.service.create).not.toHaveBeenCalled();
    });

    it('crea el servicio con valores por defecto', async () => {
      prisma.service.create.mockResolvedValue(buildService());

      await service.createService(TENANT, { name: 'Semipermanente', durationMin: 60, price: 2500 });

      expect(prisma.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          categoryId: null,
          currency: 'EUR',
          active: true,
        }),
      });
    });
  });

  describe('updateService', () => {
    it('lanza NotFound si el servicio no pertenece al salón', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.updateService(TENANT, 'svc_x', { price: 9999 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('listPublicServices', () => {
    it('filtra por tenant y solo activos', async () => {
      prisma.service.findMany.mockResolvedValue([buildService()]);

      await service.listPublicServices(TENANT);

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT, active: true } }),
      );
    });
  });
});
