import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Notification } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

/**
 * In-app notification feed for the authenticated user (SPEC §7). Every route
 * operates only on the current user's own notifications within the resolved
 * salon; no role restriction is applied beyond authentication.
 */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Feed paginado de notificaciones del usuario (filtro no leídas).' })
  list(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryNotificationsDto,
  ): Promise<PaginatedResult<Notification>> {
    return this.notifications.listForUser(this.requireTenant(tenantId), userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contador de notificaciones no leídas del usuario.' })
  async unreadCount(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notifications.unreadCount(this.requireTenant(tenantId), userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca una notificación como leída.' })
  markRead(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<Notification> {
    return this.notifications.markAsRead(this.requireTenant(tenantId), userId, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca todas las notificaciones del usuario como leídas.' })
  markAllRead(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
  ): Promise<{ updated: number }> {
    return this.notifications.markAllAsRead(this.requireTenant(tenantId), userId);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
