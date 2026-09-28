import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { SuperadminService, type AdminActor } from './superadmin.service';

/** In-memory Prisma doubles; deeper flows are covered by e2e tests. */
type PrismaMock = {
  tenant: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  booking: { count: jest.Mock };
  client: { count: jest.Mock };
  supportTicket: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  subscription: { findMany: jest.Mock };
  moduleActivation: { findMany: jest.Mock; upsert: jest.Mock };
  auditLog: { create: jest.Mock };
};

const ACTOR: AdminActor = { userId: 'admin_1', email: 'admin@fgd.app' };

describe('SuperadminService', () => {
  let service: SuperadminService;
  let prisma: PrismaMock;
  let jwt: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      booking: { count: jest.fn().mockResolvedValue(0) },
      client: { count: jest.fn().mockResolvedValue(0) },
      supportTicket: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      subscription: { findMany: jest.fn().mockResolvedValue([]) },
      moduleActivation: { findMany: jest.fn(), upsert: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit_1' }) },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    const config = {
      get: jest.fn().mockReturnValue({ accessSecret: 'secret', accessTtl: 900 }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SuperadminService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(SuperadminService);
  });

  describe('impersonate', () => {
    it('lanza NotFound cuando el salón no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.impersonate('missing', ACTOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(jwt.signAsync).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('emite un token OWNER acotado al salón y registra AuditLog', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant_1' });

      const result = await service.impersonate('tenant_1', ACTOR);

      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'admin_1',
          tenantId: 'tenant_1',
          role: Role.OWNER,
          type: 'access',
        }),
        expect.objectContaining({ secret: 'secret', expiresIn: 900 }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant_1',
            actorId: 'admin_1',
            action: 'IMPERSONATE',
            entity: 'Tenant',
          }),
        }),
      );
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        expiresIn: 900,
        tenantId: 'tenant_1',
        role: Role.OWNER,
      });
    });
  });

  describe('getGlobalStats', () => {
    it('calcula el MRR aproximado a partir de suscripciones activas', async () => {
      prisma.tenant.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // active
        .mockResolvedValueOnce(3) // trial
        .mockResolvedValueOnce(1); // suspended
      prisma.booking.count.mockResolvedValue(1200);
      prisma.client.count.mockResolvedValue(800);
      prisma.supportTicket.count.mockResolvedValue(4);
      prisma.subscription.findMany.mockResolvedValue([
        { plan: { priceMonthly: 1990 } },
        { plan: { priceMonthly: 4990 } },
      ]);

      const stats = await service.getGlobalStats();

      expect(stats).toEqual({
        tenants: { total: 10, active: 6, trial: 3, suspended: 1 },
        bookingsTotal: 1200,
        clientsTotal: 800,
        openTickets: 4,
        mrrCents: 6980,
        currency: 'EUR',
      });
    });
  });

  describe('createTicket', () => {
    it('lanza NotFound si el salón no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createTicket(
          { tenantId: 'missing', subject: 'x', description: 'y' },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.supportTicket.create).not.toHaveBeenCalled();
    });

    it('crea la incidencia con el salón y el actor', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant_1' });
      prisma.supportTicket.create.mockResolvedValue({ id: 'ticket_1' });

      await service.createTicket(
        { tenantId: 'tenant_1', subject: 'Fallo agenda', description: 'Error 500' },
        ACTOR,
      );

      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant_1',
            subject: 'Fallo agenda',
            description: 'Error 500',
            createdById: 'admin_1',
          }),
        }),
      );
    });
  });

  describe('setModule', () => {
    it('activa un módulo por defecto (enabled=true) cuando no se indica', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant_1' });
      prisma.moduleActivation.upsert.mockResolvedValue({ id: 'mod_1' });

      await service.setModule('tenant_1', { moduleKey: 'academy' });

      expect(prisma.moduleActivation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_moduleKey: { tenantId: 'tenant_1', moduleKey: 'academy' } },
          create: { tenantId: 'tenant_1', moduleKey: 'academy', enabled: true },
          update: { enabled: true },
        }),
      );
    });
  });
});
