import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Product, StockMovementKind, type Supplier } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { InventoryService } from './inventory.service';

/** Minimal in-memory Prisma double; deep flows are covered in e2e. */
type PrismaMock = {
  supplier: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  product: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    fields: { lowStockThreshold: symbol };
  };
  stockMovement: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  booking: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

const TENANT = 'tenant_1';

function buildProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date();
  return {
    id: 'prod_1',
    tenantId: TENANT,
    sku: 'ESM-01',
    name: 'Esmalte rojo',
    description: null,
    category: null,
    price: 1200,
    cost: 650,
    currency: 'EUR',
    stock: 10,
    lowStockThreshold: 3,
    supplierId: null,
    imageUrl: null,
    active: true,
    isStoreItem: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildSupplier(overrides: Partial<Supplier> = {}): Supplier {
  const now = new Date();
  return {
    id: 'sup_1',
    tenantId: TENANT,
    name: 'Proveedor',
    contact: null,
    email: null,
    phone: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      supplier: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        fields: { lowStockThreshold: Symbol('lowStockThreshold') },
      },
      stockMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      booking: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(InventoryService);
  });

  describe('createProduct', () => {
    it('rechaza un SKU ya existente en el salón', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'other' });

      await expect(
        service.createProduct(TENANT, { sku: 'ESM-01', name: 'Esmalte', price: 1200 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('rechaza un proveedor de otro salón', async () => {
      prisma.product.findFirst.mockResolvedValue(null); // sku libre
      prisma.supplier.findFirst.mockResolvedValue(null); // proveedor inexistente

      await expect(
        service.createProduct(TENANT, {
          sku: 'ESM-02',
          name: 'Esmalte',
          price: 1200,
          supplierId: 'foreign_sup',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('crea el producto con valores por defecto y tenant resuelto', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(buildProduct());

      await service.createProduct(TENANT, { sku: '  ESM-01  ', name: 'Esmalte rojo', price: 1200 });

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          sku: 'ESM-01',
          currency: 'EUR',
          stock: 0,
          lowStockThreshold: 0,
          active: true,
          isStoreItem: false,
        }),
      });
    });
  });

  describe('getProduct', () => {
    it('lanza NotFound si el producto no pertenece al salón', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.getProduct(TENANT, 'prod_x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createStockMovement', () => {
    it('suma stock en una entrada (IN) de forma transaccional', async () => {
      prisma.product.findFirst.mockResolvedValue(buildProduct({ stock: 10 }));
      const updateMock = jest.fn().mockResolvedValue(buildProduct({ stock: 15 }));
      const movementMock = jest.fn().mockResolvedValue({ id: 'mov_1' });
      prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb({ product: { update: updateMock }, stockMovement: { create: movementMock } }),
      );

      await service.createStockMovement(TENANT, 'prod_1', {
        kind: StockMovementKind.IN,
        quantity: 5,
      });

      expect(updateMock).toHaveBeenCalledWith({ where: { id: 'prod_1' }, data: { stock: 15 } });
      expect(movementMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          productId: 'prod_1',
          kind: StockMovementKind.IN,
          quantity: 5,
        }),
      });
    });

    it('rechaza una salida (OUT) que dejaría el stock negativo', async () => {
      prisma.product.findFirst.mockResolvedValue(buildProduct({ stock: 2 }));

      await expect(
        service.createStockMovement(TENANT, 'prod_1', {
          kind: StockMovementKind.OUT,
          quantity: 5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('fija el stock absoluto en un ajuste (ADJUST)', async () => {
      prisma.product.findFirst.mockResolvedValue(buildProduct({ stock: 10 }));
      const updateMock = jest.fn().mockResolvedValue(buildProduct({ stock: 4 }));
      const movementMock = jest.fn().mockResolvedValue({ id: 'mov_2' });
      prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb({ product: { update: updateMock }, stockMovement: { create: movementMock } }),
      );

      await service.createStockMovement(TENANT, 'prod_1', {
        kind: StockMovementKind.ADJUST,
        quantity: 4,
      });

      expect(updateMock).toHaveBeenCalledWith({ where: { id: 'prod_1' }, data: { stock: 4 } });
    });
  });

  describe('listLowStock', () => {
    it('filtra por tenant y usa la referencia de campo lowStockThreshold', async () => {
      prisma.product.findMany.mockResolvedValue([buildProduct({ stock: 1 })]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.listLowStock(TENANT, {
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
        skip: 0,
        take: 20,
      } as never);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT,
            stock: { lte: prisma.product.fields.lowStockThreshold },
          },
          orderBy: { stock: 'asc' },
        }),
      );
      expect(result.meta.total).toBe(1);
    });
  });

  describe('listSuppliers', () => {
    it('aplica búsqueda por nombre/contacto/email', async () => {
      prisma.supplier.findMany.mockResolvedValue([buildSupplier()]);
      prisma.supplier.count.mockResolvedValue(1);

      await service.listSuppliers(TENANT, {
        page: 1,
        pageSize: 20,
        sortOrder: 'asc',
        search: 'belleza',
        skip: 0,
        take: 20,
      } as never);

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, OR: expect.any(Array) }),
        }),
      );
    });
  });
});
