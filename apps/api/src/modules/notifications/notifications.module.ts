import { Module } from '@nestjs/common';

import { MessageTemplatesController } from './message-templates.controller';
import { MessageTemplatesService } from './message-templates.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Notifications module — per-user in-app notification feed and staff-managed
 * message templates (SPEC §7 `notifications`). `NotificationsService` is exported
 * so other domains can create notifications during integration. Registered
 * centrally in `app.module.ts` during the integration phase.
 */
@Module({
  controllers: [NotificationsController, MessageTemplatesController],
  providers: [NotificationsService, MessageTemplatesService],
  exports: [NotificationsService, MessageTemplatesService],
})
export class NotificationsModule {}
