import { PartialType } from '@nestjs/swagger';

import { CreateSupplierDto } from './create-supplier.dto';

/** Partial payload to update a supplier (all fields optional). */
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
