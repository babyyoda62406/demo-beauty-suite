import { Injectable, NotFoundException } from '@nestjs/common';
import { type Notification, type Prisma } from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type QueryNotificationsDto } from './dto/query-notifications.dto';

/**
 * Input for {@link NotificationsService.createNotification}. This method is the
 * reusable entry point other domains call (via the injected service) to notify a
 * user — e.g. bookings confirming an appointment, loyalty granting a reward.
 */
export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

/**
 * Notifications domain service (SPEC §6/§7). Serves each user's in-app feed
 * (list, unread count, mark-as-read) and exposes {@link createNotification} as a
 * reusable primitive for cross-domain integration.
 *
 * All operations are strictly tenant-scoped (SPEC §3): every query carries the
 * resolved `tenantId` on top of the Prisma tenant middleware, and single-row
 * writes act on ids already verified to belong to the salon and the acting user
 * (the middleware cannot scope unique-`where` writes — see `PrismaService`).
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a notification for a user. Reusable across domains: other modules
   * inject this service and call it directly (no cross-module coupling).
   */
  createNotification(input: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        ...(input.data !== undefined ? { data: input.data } : {}),
      },
    });
  }

  /** Paginated feed for the authenticated user, newest first; optional unread filter. */
  async listForUser(
    tenantId: string,
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<Notification>> {
    const where: Prisma.NotificationWhereInput = { tenantId, userId };
    if (query.unread === true) {
      where.read = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /** Number of unread notifications for the authenticated user. */
  unreadCount(tenantId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { tenantId, userId, read: false },
    });
  }

  /** Marks a single notification (owned by the user) as read. Idempotent. */
  async markAsRead(tenantId: string, userId: string, id: string): Promise<Notification> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (existing.read) {
      return existing;
    }
    return this.prisma.notification.update({
      where: { id: existing.id },
      data: { read: true },
    });
  }

  /** Marks every unread notification of the user as read; returns the count updated. */
  async markAllAsRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, userId, read: false },
      data: { read: true },
    });
    return { updated: result.count };
  }
}
