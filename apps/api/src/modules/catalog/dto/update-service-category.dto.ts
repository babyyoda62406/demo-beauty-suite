import { PartialType } from '@nestjs/swagger';

import { CreateServiceCategoryDto } from './create-service-category.dto';

/** Partial payload to update a service category (all fields optional). */
export class UpdateServiceCategoryDto extends PartialType(CreateServiceCategoryDto) {}
