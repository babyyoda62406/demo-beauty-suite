import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';

import { BookingsService } from './bookings.service';

/**
 * Unit coverage for the critical booking flows (SPEC §11): availability slicing,
 * loyalty accrual on completion, and state-machine guards. Prisma is mocked;
 * deeper integration is covered by e2e.
 */
type PrismaMock = {
  service: { findFirst: jest.Mock };
  employee: { findFirst: jest.Mock; findMany: jest.Mock };
  workingHours: { findMany: jest.Mock };
  timeOff: { findMany: jest.Mock; findFirst: jest.Mock };
  booking: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  loyaltyCard: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  loyaltyTransaction: { create: jest.Mock };
  $transaction: jest.Mock;
};

/** Fixed far-future day so the "slot must be in the future" filter passes. */
const DAY = '2999-01-01';
const at = (hour: number, minute = 0): Date => new Date(Date.UTC(2999, 0, 1, hour, minute, 0, 0));

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      service: { findFirst: jest.fn() },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
      workingHours: { findMany: jest.fn() },
      timeOff: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      loyaltyCard: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      loyaltyTransaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    // Interactive transaction runs the callback against the same mock client.
    prisma.$transaction.mockImplementation((cb: (tx: PrismaMock) => unknown) => cb(prisma));

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [BookingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(BookingsService);
  });

  describe('getAvailability', () => {
    it('genera slots libres y descarta los que colisionan con una reserva', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: 'svc', durationMin: 60 });
      prisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
      prisma.workingHours.findMany.mockResolvedValue([{ startTime: '09:00', endTime: '12:00' }]);
      // A booking 10:00–11:00 blocks every 60-min slot overlapping that window.
      prisma.booking.findMany.mockResolvedValue([{ startAt: at(10), endAt: at(11) }]);

      const result = await service.getAvailability({ serviceId: 'svc', employeeId: 'e1', date: DAY });

      const starts = result.slots.map((s) => s.startAt);
      expect(result.durationMin).toBe(60);
      expect(starts).toContain(at(9).toISOString());
      expect(starts).toContain(at(11).toISOString());
      expect(starts).not.toContain(at(10).toISOString());
      // The only fully-free 60-min starts on a 15-min grid in [09:00,12:00] are 09:00 and 11:00.
      expect(result.slots).toHaveLength(2);
      expect(result.slots[0]?.employeeIds).toEqual(['e1']);
    });
  });

  describe('complete', () => {
    it('completa la cita y suma un sello, otorgando servicio gratis en el décimo', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: 'CONFIRMED',
        clientId: 'c1',
        serviceId: 'svc',
      });
      prisma.booking.update.mockResolvedValue({ id: 'b1', status: 'COMPLETED' });
      prisma.loyaltyCard.findFirst.mockResolvedValue({ id: 'card1', stamps: 9, freeEarned: 0 });
      prisma.loyaltyCard.update.mockResolvedValue({ id: 'card1', stamps: 10, freeEarned: 1 });

      const result = await service.complete('b1');

      expect(result.status).toBe('COMPLETED');
      expect(prisma.loyaltyCard.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stamps: 10, freeEarned: 1 } }),
      );
      expect(prisma.loyaltyTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('crea la tarjeta de fidelización en el primer sello', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b2',
        status: 'CONFIRMED',
        clientId: 'c2',
        serviceId: 'svc',
      });
      prisma.booking.update.mockResolvedValue({ id: 'b2', status: 'COMPLETED' });
      prisma.loyaltyCard.findFirst.mockResolvedValue(null);
      prisma.loyaltyCard.create.mockResolvedValue({ id: 'card2', stamps: 1, freeEarned: 0 });

      await service.complete('b2');

      expect(prisma.loyaltyCard.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stamps: 1 }) }),
      );
      expect(prisma.loyaltyTransaction.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirm', () => {
    it('rechaza confirmar una reserva que no está pendiente', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', status: 'COMPLETED' });

      await expect(service.confirm('b1')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
