import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  type GiftCard,
  GiftCardStatus,
  type LoyaltyCard,
  type Voucher,
  VoucherStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { GiftCardsService } from './gift-cards.service';
import { LoyaltyService, STAMPS_PER_REWARD } from './loyalty.service';
import { VouchersService } from './vouchers.service';

const TENANT = 'tenant_1';

function buildCard(overrides: Partial<LoyaltyCard> = {}): LoyaltyCard {
  const now = new Date();
  return {
    id: 'card_1',
    tenantId: TENANT,
    clientId: 'client_1',
    stamps: 0,
    freeEarned: 0,
    redeemedCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildVoucher(overrides: Partial<Voucher> = {}): Voucher {
  const now = new Date();
  return {
    id: 'voucher_1',
    tenantId: TENANT,
    clientId: 'client_1',
    serviceId: null,
    totalSessions: 5,
    usedSessions: 0,
    price: 10000,
    currency: 'EUR',
    expiresAt: null,
    status: VoucherStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildGiftCard(overrides: Partial<GiftCard> = {}): GiftCard {
  const now = new Date();
  return {
    id: 'gift_1',
    tenantId: TENANT,
    code: 'GC-ABCDE',
    initialAmount: 5000,
    balance: 5000,
    currency: 'EUR',
    design: 'ciruela',
    publicToken: 'tok_prueba',
    recipientName: null,
    senderName: null,
    serviceId: null,
    purchasedByClientId: null,
    redeemedByClientId: null,
    status: GiftCardStatus.ACTIVE,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let prisma: {
    loyaltyCard: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    loyaltyTransaction: { create: jest.Mock; findMany: jest.Mock };
    client: { findFirst: jest.Mock };
    booking: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      loyaltyCard: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      loyaltyTransaction: { create: jest.fn(), findMany: jest.fn() },
      client: { findFirst: jest.fn() },
      booking: { findFirst: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [LoyaltyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(LoyaltyService);
  });

  describe('addStamps', () => {
    it('convierte cada 10 sellos en una recompensa gratuita', async () => {
      prisma.loyaltyCard.findFirst.mockResolvedValue(buildCard({ stamps: 8 }));
      prisma.loyaltyCard.update.mockResolvedValue(buildCard({ stamps: 1, freeEarned: 1 }));
      prisma.loyaltyTransaction.create.mockResolvedValue({});

      await service.addStamps(TENANT, 'card_1', { count: 3 });

      // 8 + 3 = 11 → 1 recompensa, resto 1 sello.
      expect(prisma.loyaltyCard.update).toHaveBeenCalledWith({
        where: { id: 'card_1' },
        data: { stamps: 11 % STAMPS_PER_REWARD, freeEarned: { increment: 1 } },
      });
      expect(prisma.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ cardId: 'card_1', delta: 3, reason: 'SERVICE_COMPLETED' }),
      });
    });
  });

  describe('redeemReward', () => {
    it('rechaza el canje si no hay recompensas disponibles', async () => {
      prisma.loyaltyCard.findFirst.mockResolvedValue(buildCard({ freeEarned: 0 }));

      await expect(service.redeemReward(TENANT, 'card_1', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.loyaltyCard.update).not.toHaveBeenCalled();
    });

    it('descuenta una recompensa y registra el movimiento', async () => {
      prisma.loyaltyCard.findFirst.mockResolvedValue(buildCard({ freeEarned: 2 }));
      prisma.loyaltyCard.update.mockResolvedValue(buildCard({ freeEarned: 1, redeemedCount: 1 }));
      prisma.loyaltyTransaction.create.mockResolvedValue({});

      await service.redeemReward(TENANT, 'card_1', {});

      expect(prisma.loyaltyCard.update).toHaveBeenCalledWith({
        where: { id: 'card_1' },
        data: { freeEarned: { decrement: 1 }, redeemedCount: { increment: 1 } },
      });
      expect(prisma.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ delta: -1, reason: 'REDEEM_FREE' }),
      });
    });
  });

  describe('createCard', () => {
    it('rechaza abrir una segunda tarjeta para la misma clienta', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'client_1' });
      prisma.loyaltyCard.findFirst.mockResolvedValue({ id: 'card_1' });

      await expect(service.createCard(TENANT, 'client_1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.loyaltyCard.create).not.toHaveBeenCalled();
    });
  });
});

describe('VouchersService', () => {
  let service: VouchersService;
  let prisma: {
    voucher: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    client: { findFirst: jest.Mock };
    service: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      voucher: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      client: { findFirst: jest.fn() },
      service: { findFirst: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [VouchersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(VouchersService);
  });

  it('marca el bono como USED al consumir la última sesión', async () => {
    prisma.voucher.findFirst.mockResolvedValue(buildVoucher({ totalSessions: 3, usedSessions: 2 }));
    prisma.voucher.update.mockResolvedValue(
      buildVoucher({ totalSessions: 3, usedSessions: 3, status: VoucherStatus.USED }),
    );

    const result = await service.consume(TENANT, 'voucher_1');

    expect(prisma.voucher.update).toHaveBeenCalledWith({
      where: { id: 'voucher_1' },
      data: { usedSessions: 3, status: VoucherStatus.USED },
    });
    expect(result.remainingSessions).toBe(0);
  });

  it('rechaza (y marca EXPIRED) un bono caducado', async () => {
    prisma.voucher.findFirst.mockResolvedValue(
      buildVoucher({ expiresAt: new Date(Date.now() - 1000) }),
    );
    prisma.voucher.update.mockResolvedValue(buildVoucher({ status: VoucherStatus.EXPIRED }));

    await expect(service.consume(TENANT, 'voucher_1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucher.update).toHaveBeenCalledWith({
      where: { id: 'voucher_1' },
      data: { status: VoucherStatus.EXPIRED },
    });
  });
});

describe('GiftCardsService', () => {
  let service: GiftCardsService;
  let prisma: {
    giftCard: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    giftCardTransaction: { create: jest.Mock; findMany: jest.Mock };
    client: { findFirst: jest.Mock };
    service: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      giftCard: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      giftCardTransaction: { create: jest.fn(), findMany: jest.fn() },
      client: { findFirst: jest.fn() },
      service: { findFirst: jest.fn() },
      // `$transaction` recibe las promesas ya lanzadas por los mocks
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [GiftCardsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(GiftCardsService);
  });

  it('genera un código único al emitir sin código', async () => {
    prisma.giftCard.findFirst.mockResolvedValue(null);
    prisma.giftCard.create.mockResolvedValue(buildGiftCard());

    await service.create(TENANT, { initialAmount: 5000 });

    const createArgs = prisma.giftCard.create.mock.calls[0][0] as { data: { code: string; balance: number } };
    expect(createArgs.data.code).toMatch(/^GC-[0-9A-F]+$/);
    expect(createArgs.data.balance).toBe(5000);
  });

  it('rechaza canjear un importe mayor que el saldo', async () => {
    prisma.giftCard.findFirst.mockResolvedValue(buildGiftCard({ balance: 1000 }));

    await expect(service.redeem(TENANT, 'gift_1', { amount: 2000 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.giftCard.update).not.toHaveBeenCalled();
  });

  it('deja constancia del descuento en el historial', async () => {
    prisma.giftCard.findFirst.mockResolvedValue(buildGiftCard({ balance: 5000 }));
    prisma.giftCard.update.mockResolvedValue(buildGiftCard({ balance: 3000 }));
    prisma.giftCardTransaction.create.mockResolvedValue({});

    await service.redeem(TENANT, 'gift_1', { amount: 2000, reason: 'Manicura' }, 'user_1');

    expect(prisma.giftCardTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        giftCardId: 'gift_1',
        amount: -2000,
        balance: 3000,
        reason: 'Manicura',
        userId: 'user_1',
      }),
    });
  });

  it('no deja devolver más de lo que se ha gastado', async () => {
    // de 5000 iniciales quedan 3000: solo se pueden devolver 2000
    prisma.giftCard.findFirst.mockResolvedValue(buildGiftCard({ balance: 3000 }));

    await expect(service.refund(TENANT, 'gift_1', 2500)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.giftCard.update).not.toHaveBeenCalled();
  });

  it('devuelve un descuento al saldo y lo registra', async () => {
    prisma.giftCard.findFirst.mockResolvedValue(buildGiftCard({ balance: 3000 }));
    prisma.giftCard.update.mockResolvedValue(buildGiftCard({ balance: 5000 }));
    prisma.giftCardTransaction.create.mockResolvedValue({});

    await service.refund(TENANT, 'gift_1', 2000, 'Tarjeta equivocada', 'user_1');

    expect(prisma.giftCard.update).toHaveBeenCalledWith({
      where: { id: 'gift_1' },
      data: { balance: 5000, status: GiftCardStatus.ACTIVE },
    });
    expect(prisma.giftCardTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 2000, balance: 5000, reason: 'Tarjeta equivocada' }),
    });
  });

  it('marca REDEEMED cuando el saldo llega a cero', async () => {
    prisma.giftCard.findFirst.mockResolvedValue(buildGiftCard({ balance: 2000 }));
    prisma.giftCard.update.mockResolvedValue(
      buildGiftCard({ balance: 0, status: GiftCardStatus.REDEEMED }),
    );

    await service.redeem(TENANT, 'gift_1', { amount: 2000 });

    expect(prisma.giftCard.update).toHaveBeenCalledWith({
      where: { id: 'gift_1' },
      data: expect.objectContaining({ balance: 0, status: GiftCardStatus.REDEEMED }),
    });
  });
});
