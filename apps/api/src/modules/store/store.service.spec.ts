import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { type AuthenticatedUser } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantStorage, type TenantStore } from '../../tenancy/tenant-context';

import { StoreService } from './store.service';

/** Runs `fn` inside a tenant context so tenant-id resolution succeeds. */
const withTenant = <T>(fn: () => Promise<T>): Promise<T> => {
  const store: TenantStore = { tenantId: 't1', userId: 'u1', role: 'OWNER' };
  return tenantStorage.run(store, fn);
};

/**
 * Unit coverage for the critical store flows (SPEC §11): checkout totals + stock
 * decrement, insufficient-stock rejection, and restock on cancellation. Prisma
 * is mocked; deeper integration is covered by e2e.
 */
type PrismaMock = {
  product: { findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
  client: { findFirst: jest.Mock };
  order: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock; create: jest.Mock; update: jest.Mock };
  stockMovement: { create: jest.Mock };
  payment: { create: jest.Mock; updateMany: jest.Mock };
  $transaction: jest.Mock;
};

const STAFF: AuthenticatedUser = {
  userId: 'u1',
  tenantId: 't1',
  role: 'OWNER',
  email: 'owner@salon.test',
};

describe('StoreService', () => {
  let service: StoreService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      product: { findMany: jest.fn(), count: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      client: { findFirst: jest.fn() },
      order: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: { create: jest.fn().mockResolvedValue({}) },
      payment: { create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    // Interactive transaction runs the callback against the same mock client.
    prisma.$transaction.mockImplementation((cb: (tx: PrismaMock) => unknown) => cb(prisma));

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [StoreService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(StoreService);
  });

  describe('checkout', () => {
    it('calcula totales, crea el pedido y descuenta stock', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Esmalte', price: 1500, currency: 'EUR', stock: 10 },
        { id: 'p2', name: 'Lima', price: 500, currency: 'EUR', stock: 4 },
      ]);
      prisma.order.create.mockResolvedValue({ id: 'o1', total: 3500 });
      prisma.payment.create.mockResolvedValue({ id: 'pay1' });
      prisma.order.update.mockResolvedValue({ id: 'o1', total: 3500, paymentId: 'pay1' });

      const result = await withTenant(() =>
        service.checkout(
          { items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] },
          STAFF,
        ),
      );

      // subtotal = 2*1500 + 1*500 = 3500, no shipping.
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ subtotal: 3500, total: 3500, status: 'PENDING' }) }),
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' }, data: { stock: { decrement: 2 } } }),
      );
      expect(prisma.stockMovement.create).toHaveBeenCalledTimes(2);
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 3500, method: 'STRIPE', status: 'PENDING' }) }),
      );
      expect(result.paymentId).toBe('pay1');
    });

    it('rechaza el checkout cuando el stock es insuficiente', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Esmalte', price: 1500, currency: 'EUR', stock: 1 },
      ]);

      await expect(
        withTenant(() => service.checkout({ items: [{ productId: 'p1', quantity: 3 }] }, STAFF)),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('repone stock al cancelar un pedido pendiente', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        items: [{ productId: 'p1', quantity: 2 }],
      });
      prisma.order.update.mockResolvedValue({ id: 'o1', status: 'CANCELLED' });

      const result = await withTenant(() => service.updateStatus('o1', 'CANCELLED'));

      expect(result.status).toBe('CANCELLED');
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' }, data: { stock: { increment: 2 } } }),
      );
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ kind: 'IN', quantity: 2 }) }),
      );
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });

    it('rechaza una transición no permitida', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'o1', status: 'DELIVERED', items: [] });

      await expect(
        withTenant(() => service.updateStatus('o1', 'SHIPPED')),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
