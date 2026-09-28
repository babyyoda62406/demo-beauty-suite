import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Employee } from '@prisma/client';

import { PaginationDto } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { EmployeesService } from './employees.service';
import { type QueryEmployeesDto } from './dto/query-employees.dto';

/** In-memory doubles kept deliberately small; deep flows are covered in e2e. */
type PrismaMock = {
  employee: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  workingHours: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; delete: jest.Mock };
  timeOff: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; delete: jest.Mock };
  booking: { findMany: jest.Mock; groupBy: jest.Mock; aggregate: jest.Mock };
  commission: { findMany: jest.Mock; create: jest.Mock };
  user: { findFirst: jest.Mock };
};

const TENANT = 'tenant_1';

function buildEmployee(overrides: Partial<Employee> = {}): Employee {
  const now = new Date();
  return {
    id: 'emp_1',
    tenantId: TENANT,
    userId: null,
    name: 'Estudio Aurora',
    title: 'Nail artist',
    phone: null,
    email: null,
    photoUrl: null,
    color: '#D6157F',
    commissionRate: 1500,
    salary: null,
    hireDate: null,
    active: true,
    bookable: true,
    bio: null,
    specialties: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function queryDto(overrides: Partial<QueryEmployeesDto> = {}): QueryEmployeesDto {
  return Object.assign(new PaginationDto(), overrides) as QueryEmployeesDto;
}

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      employee: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workingHours: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
      timeOff: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
      booking: { findMany: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn() },
      commission: { findMany: jest.fn(), create: jest.fn() },
      user: { findFirst: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [EmployeesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(EmployeesService);
  });

  describe('create', () => {
    it('inyecta el tenantId y normaliza nombre/email', async () => {
      prisma.employee.create.mockResolvedValue(buildEmployee());

      await service.create(TENANT, { name: '  Aurora  ', email: 'AURORA@EXAMPLE.COM' });

      expect(prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            name: 'Aurora',
            email: 'aurora@example.com',
          }),
        }),
      );
    });
  });

  describe('list', () => {
    it('filtra por tenant, active/bookable y búsqueda', async () => {
      prisma.employee.findMany.mockResolvedValue([buildEmployee()]);
      prisma.employee.count.mockResolvedValue(1);

      const result = await service.list(TENANT, queryDto({ search: 'aurora', active: true }));

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, active: true }),
        }),
      );
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getEmployee', () => {
    it('lanza NotFoundException cuando no existe en el tenant', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.getEmployee(TENANT, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listPublicTeam', () => {
    it('sólo devuelve equipo activo y reservable', async () => {
      prisma.employee.findMany.mockResolvedValue([]);

      await service.listPublicTeam(TENANT);

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, active: true, bookable: true },
        }),
      );
    });
  });

  describe('addSchedule', () => {
    it('rechaza tramos con hora de inicio posterior a la de fin', async () => {
      prisma.employee.findFirst.mockResolvedValue(buildEmployee());

      await expect(
        service.addSchedule(TENANT, 'emp_1', { weekday: 1, startTime: '18:00', endTime: '09:00' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('calculateCommissions', () => {
    it('lanza BadRequest si el profesional no tiene tasa de comisión', async () => {
      prisma.employee.findFirst.mockResolvedValue(buildEmployee({ commissionRate: null }));

      await expect(
        service.calculateCommissions(TENANT, 'emp_1', '2026-08'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('calcula amount = round(price * rate / 10000) y omite citas ya facturadas', async () => {
      prisma.employee.findFirst.mockResolvedValue(buildEmployee({ commissionRate: 1500 }));
      prisma.booking.findMany.mockResolvedValue([
        { id: 'b_new', price: 10000, currency: 'EUR' },
        { id: 'b_old', price: 5000, currency: 'EUR' },
      ]);
      prisma.commission.findMany.mockResolvedValue([{ bookingId: 'b_old' }]);
      prisma.commission.create.mockImplementation((args: { data: unknown }) => ({
        id: 'c_1',
        ...(args.data as object),
      }));

      const result = await service.calculateCommissions(TENANT, 'emp_1', '2026-08');

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      // 10000 * 1500 / 10000 = 1500 cents
      expect(result.totalAmount).toBe(1500);
      expect(prisma.commission.create).toHaveBeenCalledTimes(1);
      expect(prisma.commission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookingId: 'b_new', amount: 1500, period: '2026-08' }),
        }),
      );
    });
  });

  describe('performance', () => {
    it('agrega conteos por estado e ingresos de citas COMPLETED', async () => {
      prisma.employee.findFirst.mockResolvedValue(buildEmployee());
      prisma.booking.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { _all: 3 } },
        { status: 'CANCELLED', _count: { _all: 1 } },
      ]);
      prisma.booking.aggregate.mockResolvedValue({ _sum: { price: 30000 } });

      const result = await service.performance(TENANT, 'emp_1', undefined, undefined);

      expect(result.totalBookings).toBe(4);
      expect(result.completedBookings).toBe(3);
      expect(result.cancelledBookings).toBe(1);
      expect(result.revenue).toBe(30000);
    });
  });
});
