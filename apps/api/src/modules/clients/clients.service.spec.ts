import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Client } from '@prisma/client';

import { PaginationDto } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { ClientsService } from './clients.service';

/** In-memory doubles kept deliberately small; deep flows are covered in e2e. */
type PrismaMock = {
  client: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  clientPhoto: { create: jest.Mock };
  booking: { findFirst: jest.Mock };
};

const TENANT = 'tenant_1';

function buildClient(overrides: Partial<Client> = {}): Client {
  const now = new Date();
  return {
    id: 'client_1',
    tenantId: TENANT,
    userId: null,
    name: 'Lucía Fernández',
    phone: '+34600111222',
    email: null,
    instagram: null,
    birthDate: null,
    photoUrl: null,
    allergies: null,
    preferences: null,
    favoriteColors: null,
    notes: null,
    loyaltyPoints: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function paginationDto(overrides: Partial<PaginationDto> = {}): PaginationDto {
  return Object.assign(new PaginationDto(), overrides);
}

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      client: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      clientPhoto: { create: jest.fn() },
      booking: { findFirst: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ClientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ClientsService);
  });

  describe('create', () => {
    it('inyecta el tenantId y normaliza email en minúsculas', async () => {
      prisma.client.create.mockResolvedValue(buildClient());

      await service.create(TENANT, {
        name: '  Lucía  ',
        phone: ' +34600111222 ',
        email: 'LUCIA@EXAMPLE.COM',
      });

      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            name: 'Lucía',
            phone: '+34600111222',
            email: 'lucia@example.com',
          }),
        }),
      );
    });
  });

  describe('list', () => {
    it('filtra por tenant y aplica búsqueda por nombre/teléfono/email', async () => {
      prisma.client.findMany.mockResolvedValue([buildClient()]);
      prisma.client.count.mockResolvedValue(1);

      const result = await service.list(TENANT, paginationDto({ search: 'lucia' }));

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT,
            OR: expect.arrayContaining([
              { name: { contains: 'lucia', mode: 'insensitive' } },
              { phone: { contains: 'lucia' } },
              { email: { contains: 'lucia', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException cuando la clienta no existe en el tenant', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('addPhoto', () => {
    it('rechaza una cita que no pertenece a la clienta', async () => {
      prisma.client.findFirst.mockResolvedValue(buildClient());
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.addPhoto(TENANT, 'client_1', { url: 'https://x/y.jpg', bookingId: 'b_x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea la foto con kind por defecto DESIGN', async () => {
      prisma.client.findFirst.mockResolvedValue(buildClient());
      prisma.clientPhoto.create.mockResolvedValue({ id: 'photo_1' });

      await service.addPhoto(TENANT, 'client_1', { url: 'https://x/y.jpg' });

      expect(prisma.clientPhoto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientId: 'client_1', kind: 'DESIGN', bookingId: null }),
        }),
      );
    });
  });

  describe('upcomingBirthdays', () => {
    it('incluye clientas cuyo cumpleaños cae dentro de la ventana', async () => {
      const now = new Date();
      const inFiveDays = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 5),
      );
      // Same month/day, distant birth year.
      const birthDate = new Date(Date.UTC(1990, inFiveDays.getUTCMonth(), inFiveDays.getUTCDate()));

      prisma.client.findMany.mockResolvedValue([
        {
          id: 'client_1',
          name: 'Lucía',
          phone: '+34600111222',
          email: null,
          photoUrl: null,
          birthDate,
        },
      ]);

      const result = await service.upcomingBirthdays(TENANT, 30);

      expect(result).toHaveLength(1);
      expect(result[0]?.daysUntil).toBeLessThanOrEqual(30);
      expect(result[0]?.turningAge).toBeGreaterThan(0);
    });

    it('excluye cumpleaños fuera de la ventana', async () => {
      const now = new Date();
      const farAway = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90),
      );
      const birthDate = new Date(Date.UTC(1990, farAway.getUTCMonth(), farAway.getUTCDate()));

      prisma.client.findMany.mockResolvedValue([
        {
          id: 'client_1',
          name: 'Lucía',
          phone: '+34600111222',
          email: null,
          photoUrl: null,
          birthDate,
        },
      ]);

      const result = await service.upcomingBirthdays(TENANT, 30);
      expect(result).toHaveLength(0);
    });
  });
});
