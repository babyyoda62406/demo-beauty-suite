import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { PlansBillingService } from './plans-billing.service';

/** In-memory Prisma doubles; deep flows are covered in e2e. */
type PrismaMock = {
  plan: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  subscription: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  tenant: { update: jest.Mock };
};

describe('PlansBillingService', () => {
  let service: PlansBillingService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      plan: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sub_1', status: SubscriptionStatus.TRIALING }),
        update: jest.fn(),
      },
      tenant: { update: jest.fn().mockResolvedValue({ id: 'tenant_1' }) },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [PlansBillingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PlansBillingService);
  });

  describe('createPlan', () => {
    it('rechaza una clave de plan ya existente', async () => {
      prisma.plan.findUnique.mockResolvedValue({ key: 'STARTER' });

      await expect(
        service.createPlan({ key: 'STARTER', name: 'Starter', priceMonthly: 0 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea el plan con moneda por defecto EUR', async () => {
      prisma.plan.findUnique.mockResolvedValue(null);
      prisma.plan.create.mockResolvedValue({ key: 'STARTER' });

      await service.createPlan({ key: 'STARTER', name: 'Starter', priceMonthly: 1990 });

      expect(prisma.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ key: 'STARTER', currency: 'EUR', priceMonthly: 1990 }),
        }),
      );
    });
  });

  describe('subscribe', () => {
    it('exige un tenant resuelto', async () => {
      await expect(service.subscribe({ planKey: 'STARTER' }, null)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza una segunda suscripción activa', async () => {
      prisma.plan.findUnique.mockResolvedValue({ key: 'STARTER' });
      prisma.subscription.findFirst.mockResolvedValue({ id: 'sub_open' });

      await expect(
        service.subscribe({ planKey: 'STARTER' }, 'tenant_1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea la suscripción en TRIALING y sincroniza el plan del tenant', async () => {
      prisma.plan.findUnique.mockResolvedValue({ key: 'PROFESSIONAL' });

      const result = await service.subscribe({ planKey: 'PROFESSIONAL' }, 'tenant_1');

      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant_1',
            planKey: 'PROFESSIONAL',
            status: SubscriptionStatus.TRIALING,
          }),
        }),
      );
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant_1' }, data: { planKey: 'PROFESSIONAL' } }),
      );
      expect(result.status).toBe(SubscriptionStatus.TRIALING);
    });
  });

  describe('cancelMySubscription', () => {
    it('lanza NotFound cuando no hay suscripción activa', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelMySubscription('tenant_1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('cancela la suscripción activa por su id resuelto en el tenant', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ id: 'sub_1' });
      prisma.subscription.update.mockResolvedValue({ id: 'sub_1', status: SubscriptionStatus.CANCELLED });

      const result = await service.cancelMySubscription('tenant_1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub_1' },
          data: { status: SubscriptionStatus.CANCELLED },
        }),
      );
      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
    });
  });

  describe('handleStripeWebhook', () => {
    it('acepta el evento y responde received', async () => {
      const result = await service.handleStripeWebhook(
        { type: 'customer.subscription.updated' },
        'sig_test',
      );
      expect(result).toEqual({ received: true });
    });
  });
});
