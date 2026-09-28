import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type CashSession, type Invoice, type Payment } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { PaymentsCashService } from './payments-cash.service';

/** Minimal in-memory Prisma double; deep flows are covered in e2e. */
type PrismaMock = {
  payment: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    aggregate: jest.Mock;
    groupBy: jest.Mock;
  };
  invoice: {
    create: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
  };
  expense: {
    aggregate: jest.Mock;
  };
  cashSession: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  client: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

const TENANT = 'tenant_1';

describe('PaymentsCashService', () => {
  let service: PaymentsCashService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      payment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      invoice: {
        create: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      expense: {
        aggregate: jest.fn(),
      },
      cashSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      client: { findFirst: jest.fn() },
      // Interactive transaction: run the callback with the same mock as `tx`.
      $transaction: jest.fn((cb: (tx: PrismaMock) => unknown) => cb(prisma)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [PaymentsCashService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PaymentsCashService);
  });

  describe('createPayment', () => {
    it('inyecta el tenant y usa PENDING por defecto', async () => {
      prisma.payment.create.mockResolvedValue({ id: 'pay_1' } as Payment);

      await service.createPayment(TENANT, { amount: 2500, method: 'CASH' });

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          amount: 2500,
          method: 'CASH',
          status: 'PENDING',
          currency: 'EUR',
        }),
      });
    });
  });

  describe('createInvoice', () => {
    it('calcula subtotal/impuesto/total y numera de forma secuencial', async () => {
      prisma.invoice.count.mockResolvedValue(4); // → sequence 5
      prisma.invoice.create.mockImplementation(
        ({ data }: { data: Invoice }): Promise<Invoice> => Promise.resolve(data),
      );

      await service.createInvoice(TENANT, {
        items: [
          { description: 'Manicura', quantity: 2, unitPrice: 2500 },
          { description: 'Pedicura', quantity: 1, unitPrice: 3000 },
        ],
        taxRate: 21,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          number: 'INV-000005',
          subtotal: 8000,
          tax: 1680,
          total: 9680,
          status: 'DRAFT',
        }),
      });
    });
  });

  describe('openCashSession', () => {
    it('rechaza abrir si ya hay una sesión abierta', async () => {
      prisma.cashSession.findFirst.mockResolvedValue({ id: 'cs_open' });

      await expect(
        service.openCashSession(TENANT, 'user_1', { openingFloat: 10000 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.cashSession.create).not.toHaveBeenCalled();
    });
  });

  describe('closeCashSession', () => {
    it('calcula el importe esperado y la diferencia', async () => {
      const openedAt = new Date('2026-08-01T08:00:00.000Z');
      prisma.cashSession.findFirst.mockResolvedValue({
        id: 'cs_1',
        openingFloat: 10000,
        openedAt,
        status: 'OPEN',
      } as CashSession);
      // CASH takings during the session.
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 25000 } });
      prisma.cashSession.update.mockImplementation(
        ({ data }: { data: Partial<CashSession> }): Promise<Partial<CashSession>> =>
          Promise.resolve(data),
      );

      await service.closeCashSession(TENANT, { closingAmount: 34000 });

      // expected = 10000 + 25000 = 35000; difference = 34000 - 35000 = -1000
      expect(prisma.cashSession.update).toHaveBeenCalledWith({
        where: { id: 'cs_1' },
        data: expect.objectContaining({
          closingAmount: 34000,
          expectedAmount: 35000,
          difference: -1000,
          status: 'CLOSED',
        }),
      });
    });

    it('lanza NotFound si no hay sesión abierta', async () => {
      prisma.cashSession.findFirst.mockResolvedValue(null);

      await expect(
        service.closeCashSession(TENANT, { closingAmount: 1000 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cashRegisterSummary', () => {
    it('agrega ingresos por método y calcula el neto', async () => {
      prisma.payment.groupBy.mockResolvedValue([
        { method: 'CASH', _sum: { amount: 25000 } },
        { method: 'CARD', _sum: { amount: 15000 } },
      ]);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 40000 }, _count: { _all: 3 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: { _all: 1 } });

      const summary = await service.cashRegisterSummary(TENANT, '2026-08-01');

      expect(summary.income.total).toBe(40000);
      expect(summary.income.byMethod).toEqual({ CASH: 25000, CARD: 15000 });
      expect(summary.expenses.total).toBe(5000);
      expect(summary.net).toBe(35000);
      expect(summary.date).toBe('2026-08-01T00:00:00.000Z');
    });
  });
});
