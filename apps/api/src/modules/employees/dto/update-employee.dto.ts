import { PartialType } from '@nestjs/swagger';

import { CreateEmployeeDto } from './create-employee.dto';

/** Partial update for an employee (all fields optional). */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
