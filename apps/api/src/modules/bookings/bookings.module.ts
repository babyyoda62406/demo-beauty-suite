import { Module } from '@nestjs/common';

import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ScheduleService } from './schedule.service';
import { TimeOffController } from './time-off.controller';
import { WorkingHoursController } from './working-hours.controller';

/**
 * Agenda / bookings domain (SPEC §7): availability, public & staff booking
 * creation, the admin agenda, the booking state machine with loyalty accrual,
 * the waitlist, and CRUD for working hours and time off. `PrismaService` is
 * provided globally; this module is registered in `app.module.ts` during the
 * integration phase.
 */
@Module({
  controllers: [BookingsController, WorkingHoursController, TimeOffController],
  providers: [BookingsService, ScheduleService],
  exports: [BookingsService, ScheduleService],
})
export class BookingsModule {}
