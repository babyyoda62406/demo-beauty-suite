import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';

import { RevenueQueryDto } from './dto/revenue-query.dto';
import { StatsRangeDto } from './dto/stats-range.dto';
import { TopServicesQueryDto } from './dto/top-services-query.dto';
import { StatsService } from './stats.service';

/** In-memory doubles kept deliberately small; deep flows are covered in e2e. */
type PrismaMock = {
  payment: { aggregate: jest.Mock; findMany: jest.Mock };
  booking: { count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
  client: { count: jest.Mock };
  service: { findMany: jest.Mock };
  employee: { findMany: jest.Mock };
  tenant: { findUnique: jest.Mock };
};

const TENANT = 'tenant_1';

function rangeDto(overrides: Partial<StatsRangeDto> = {}): StatsRangeDto {
  return Object.assign(new StatsRangeDto(), overrides);
}

function revenueDto(overrides: Partial<RevenueQueryDto> = {}): RevenueQueryDto {
  return Object.assign(new RevenueQueryDto(), overrides);
}

function topServicesDto(overrides: Partial<TopServicesQueryDto> = {}): TopServicesQueryDto {
  return Object.assign(new TopServicesQueryDto(), overrides);
}

describe('StatsService', () => {
  let service: StatsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      payment: { aggregate: jest.fn(), findMany: jest.fn() },
      booking: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
      client: { count: jest.fn() },
      service: { findMany: jest.fn() },
      employee: { findMany: jest.fn() },
      tenant: { findUnique: jest.fn().mockResolvedValue({ currency: 'EUR' }) },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(StatsService);
  });

  describe('overview', () => {
    it('scopes by tenant and computes the average ticket and new vs recurring split', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 10_000 }, _count: 4 });
      prisma.booking.count.mockResolvedValue(12);
      prisma.booking.groupBy.mockResolvedValue([{ clientId: 'c1' }, { clientId: 'c2' }, { clientId: 'c3' }]);
      // One of the three active clients pre-existed the period → recurring.
      prisma.client.count.mockResolvedValue(1);

      const result = await service.overview(TENANT, rangeDto());

      expect(prisma.payment.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, status: 'PAID' }),
        }),
      );
      expect(result.revenue).toBe(10_000);
      expect(result.averageTicket).toBe(2_500);
      expect(result.recurringClients).toBe(1);
      expect(result.newClients).toBe(2);
      expect(result.currency).toBe('EUR');
    });

    it('avoids dividing by zero when there are no payments', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });
      prisma.booking.count.mockResolvedValue(0);
      prisma.booking.groupBy.mockResolvedValue([]);

      const result = await service.overview(TENANT, rangeDto());

      expect(result.revenue).toBe(0);
      expect(result.averageTicket).toBe(0);
      expect(result.newClients).toBe(0);
      expect(result.recurringClients).toBe(0);
      expect(prisma.client.count).not.toHaveBeenCalled();
    });
  });

  describe('resolveRange (via revenue)', () => {
    it('rejects a range whose start is after its end', async () => {
      await expect(
        service.revenue(TENANT, revenueDto({ from: '2026-08-01T00:00:00.000Z', to: '2026-07-01T00:00:00.000Z' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('revenue', () => {
    it('buckets PAID payments per day filling empty days with zero', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { createdAt: new Date('2026-07-01T09:00:00.000Z'), amount: 1_500 },
        { createdAt: new Date('2026-07-01T15:00:00.000Z'), amount: 500 },
        { createdAt: new Date('2026-07-03T10:00:00.000Z'), amount: 2_000 },
      ]);

      const result = await service.revenue(
        TENANT,
        revenueDto({ from: '2026-07-01T00:00:00.000Z', to: '2026-07-03T23:59:59.000Z', granularity: 'day' }),
      );

      expect(result.series).toEqual([
        { label: '2026-07-01', value: 2_000 },
        { label: '2026-07-02', value: 0 },
        { label: '2026-07-03', value: 2_000 },
      ]);
      expect(result.granularity).toBe('day');
    });
  });

  describe('topServices', () => {
    it('ranks services by booking count and resolves their names', async () => {
      prisma.booking.groupBy.mockResolvedValue([
        { serviceId: 's1', _count: 3, _sum: { price: 9_000 } },
        { serviceId: 's2', _count: 7, _sum: { price: 14_000 } },
      ]);
      prisma.service.findMany.mockResolvedValue([
        { id: 's1', name: 'Manicura' },
        { id: 's2', name: 'Pedicura' },
      ]);

      const result = await service.topServices(TENANT, topServicesDto({ limit: 5 }));

      expect(result[0]).toEqual({ serviceId: 's2', label: 'Pedicura', value: 7, revenue: 14_000 });
      expect(result[1]).toEqual({ serviceId: 's1', label: 'Manicura', value: 3, revenue: 9_000 });
    });
  });

  describe('cancellations', () => {
    it('computes cancellation and no-show rates over the total', async () => {
      prisma.booking.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: 6 },
        { status: 'CANCELLED', _count: 2 },
        { status: 'NO_SHOW', _count: 2 },
      ]);

      const result = await service.cancellations(TENANT, rangeDto());

      expect(result.total).toBe(10);
      expect(result.cancelled).toBe(2);
      expect(result.noShow).toBe(2);
      expect(result.cancellationRate).toBeCloseTo(0.2);
      expect(result.noShowRate).toBeCloseTo(0.2);
    });
  });

  describe('employees', () => {
    it('skips unassigned bookings and sorts by revenue desc', async () => {
      prisma.booking.groupBy.mockResolvedValue([
        { employeeId: 'e1', _count: 4, _sum: { price: 8_000 } },
        { employeeId: 'e2', _count: 2, _sum: { price: 12_000 } },
      ]);
      prisma.employee.findMany.mockResolvedValue([
        { id: 'e1', name: 'Aurora' },
        { id: 'e2', name: 'Marta' },
      ]);

      const result = await service.employees(TENANT, rangeDto());

      expect(result.map((row) => row.label)).toEqual(['Marta', 'Aurora']);
      expect(result[0]?.revenue).toBe(12_000);
    });
  });
});
