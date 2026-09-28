import { Module } from '@nestjs/common';

import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

/**
 * Employees (professionals) module (SPEC §7 `employees`): CRUD, per-employee
 * schedule and time-off, commission calculation and performance. Registered
 * centrally in `app.module.ts` during the integration phase.
 */
@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
