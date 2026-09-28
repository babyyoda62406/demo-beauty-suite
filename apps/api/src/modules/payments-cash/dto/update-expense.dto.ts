import { PartialType } from '@nestjs/swagger';

import { CreateExpenseDto } from './create-expense.dto';

/** Partial payload to update an expense; all fields optional. */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
