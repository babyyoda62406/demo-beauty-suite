import { PartialType } from '@nestjs/swagger';

import { CreateProductDto } from './create-product.dto';

/** Partial payload to update a product (all fields optional). */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
