import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Payload to (un)approve a testimonial. Defaults to approving. */
export class ApproveTestimonialDto {
  @ApiPropertyOptional({ example: true, default: true, description: 'Estado de aprobación deseado.' })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}
