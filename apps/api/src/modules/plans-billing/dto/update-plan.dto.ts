import { OmitType, PartialType } from '@nestjs/swagger';

import { CreatePlanDto } from './create-plan.dto';

/**
 * Updates a plan. The `key` is the immutable identifier and cannot be changed,
 * so it is omitted; every remaining field is optional (partial update).
 */
export class UpdatePlanDto extends PartialType(OmitType(CreatePlanDto, ['key'] as const)) {}
