import { ApiProperty } from '@nestjs/swagger';
import { PlanKey } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Subscribes the resolved tenant to a plan. The tenant is taken from the
 * request context (never from the body) to preserve tenant isolation (SPEC §3).
 * Actual Stripe subscription creation is handled downstream — see the service.
 */
export class CreateSubscriptionDto {
  @ApiProperty({ enum: PlanKey, description: 'Plan al que se suscribe el salón.' })
  @IsEnum(PlanKey)
  planKey!: PlanKey;
}
