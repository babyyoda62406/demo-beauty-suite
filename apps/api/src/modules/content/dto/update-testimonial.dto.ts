import { PartialType } from '@nestjs/swagger';

import { CreateTestimonialDto } from './create-testimonial.dto';

/** Partial payload to update a testimonial (all fields optional). */
export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {}
