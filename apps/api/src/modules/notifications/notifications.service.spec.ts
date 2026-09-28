import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MessageChannel, type MessageTemplate, type Notification } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { MessageTemplatesService } from './message-templates.service';
import { NotificationsService } from './notifications.service';

const TENANT = 'tenant_1';
const USER = 'user_1';

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif_1',
    tenantId: TENANT,
    userId: USER,
    type: 'BOOKING_CONFIRMED',
    title: 'Cita confirmada',
    body: 'Tu cita ha sido confirmada',
    read: false,
    data: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildTemplate(overrides: Partial<MessageTemplate> = {}): MessageTemplate {
  const now = new Date();
  return {
    id: 'tpl_1',
    tenantId: TENANT,
    channel: MessageChannel.EMAIL,
    key: 'booking_confirmation',
    subject: 'Confirmación',
    body: 'Hola {{name}}',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  describe('createNotification', () => {
    it('crea la notificación con los datos indicados', async () => {
      prisma.notification.create.mockResolvedValue(buildNotification());

      await service.createNotification({
        tenantId: TENANT,
        userId: USER,
        type: 'BOOKING_CONFIRMED',
        title: 'Cita confirmada',
        body: 'Tu cita ha sido confirmada',
        data: { bookingId: 'b1' },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          userId: USER,
          type: 'BOOKING_CONFIRMED',
          data: { bookingId: 'b1' },
        }),
      });
    });

    it('omite el campo data cuando no se proporciona', async () => {
      prisma.notification.create.mockResolvedValue(buildNotification());

      await service.createNotification({
        tenantId: TENANT,
        userId: USER,
        type: 'GENERIC',
        title: 't',
        body: 'b',
      });

      const args = prisma.notification.create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(args.data).not.toHaveProperty('data');
    });
  });

  describe('listForUser', () => {
    it('filtra solo las no leídas cuando unread=true', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.listForUser(TENANT, USER, {
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
        skip: 0,
        take: 20,
        unread: true,
      } as never);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, userId: USER, read: false },
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('lanza NotFound si la notificación no pertenece al usuario', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(TENANT, USER, 'notif_x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('es idempotente si ya estaba leída', async () => {
      prisma.notification.findFirst.mockResolvedValue(buildNotification({ read: true }));

      await service.markAsRead(TENANT, USER, 'notif_1');

      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('marca como leída una notificación no leída', async () => {
      prisma.notification.findFirst.mockResolvedValue(buildNotification({ read: false }));
      prisma.notification.update.mockResolvedValue(buildNotification({ read: true }));

      await service.markAsRead(TENANT, USER, 'notif_1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif_1' },
        data: { read: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('devuelve el número de notificaciones actualizadas', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(TENANT, USER);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT, userId: USER, read: false },
        data: { read: true },
      });
      expect(result.updated).toBe(3);
    });
  });
});

describe('MessageTemplatesService', () => {
  let service: MessageTemplatesService;
  let prisma: {
    messageTemplate: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      messageTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [MessageTemplatesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(MessageTemplatesService);
  });

  it('rechaza crear una plantilla con canal y clave duplicados', async () => {
    prisma.messageTemplate.findFirst.mockResolvedValue({ id: 'tpl_1' });

    await expect(
      service.create(TENANT, {
        channel: MessageChannel.EMAIL,
        key: 'booking_confirmation',
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.messageTemplate.create).not.toHaveBeenCalled();
  });

  it('crea la plantilla cuando la clave está libre', async () => {
    prisma.messageTemplate.findFirst.mockResolvedValue(null);
    prisma.messageTemplate.create.mockResolvedValue(buildTemplate());

    await service.create(TENANT, {
      channel: MessageChannel.SMS,
      key: 'reminder',
      body: 'Recordatorio',
    });

    expect(prisma.messageTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TENANT,
        channel: MessageChannel.SMS,
        key: 'reminder',
      }),
    });
  });

  it('lanza NotFound al obtener una plantilla inexistente', async () => {
    prisma.messageTemplate.findFirst.mockResolvedValue(null);

    await expect(service.get(TENANT, 'tpl_x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
