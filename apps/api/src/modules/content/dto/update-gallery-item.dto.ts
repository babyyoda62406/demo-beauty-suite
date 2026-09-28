import { PartialType } from '@nestjs/swagger';

import { CreateGalleryItemDto } from './create-gallery-item.dto';

/** Partial payload to update a gallery item (all fields optional). */
export class UpdateGalleryItemDto extends PartialType(CreateGalleryItemDto) {}
