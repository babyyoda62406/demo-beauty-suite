import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Plan, PlanKey } from '@prisma/client';

import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansBillingService } from './plans-billing.service';

/**
 * Platform plan catalogue (SPEC §6). Reads are `@Public()` (public pricing);
 * writes are restricted to `SUPERADMIN`. Mounted under `/api/v1/plans`.
 */
@ApiTags('plans-billing')
@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansBillingService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista pública de planes de la plataforma.' })
  @ApiOkResponse({ description: 'Planes ordenados por precio mensual.' })
  listPlans(): Promise<Plan[]> {
    return this.service.listPlans();
  }

  @Public()
  @Get(':key')
  @ApiOperation({ summary: 'Detalle público de un plan por su clave.' })
  @ApiOkResponse({ description: 'Plan solicitado.' })
  getPlan(@Param('key', new ParseEnumPipe(PlanKey)) key: PlanKey): Promise<Plan> {
    return this.service.getPlan(key);
  }

  @Roles('SUPERADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un plan de plataforma (SUPERADMIN).' })
  @ApiOkResponse({ description: 'Plan creado.' })
  createPlan(@Body() dto: CreatePlanDto): Promise<Plan> {
    return this.service.createPlan(dto);
  }

  @Roles('SUPERADMIN')
  @Patch(':key')
  @ApiOperation({ summary: 'Actualiza un plan (SUPERADMIN).' })
  @ApiOkResponse({ description: 'Plan actualizado.' })
  updatePlan(
    @Param('key', new ParseEnumPipe(PlanKey)) key: PlanKey,
    @Body() dto: UpdatePlanDto,
  ): Promise<Plan> {
    return this.service.updatePlan(key, dto);
  }

  @Roles('SUPERADMIN')
  @Delete(':key')
  @ApiOperation({ summary: 'Elimina un plan (SUPERADMIN).' })
  @ApiOkResponse({ description: 'Confirmación de borrado.' })
  deletePlan(@Param('key', new ParseEnumPipe(PlanKey)) key: PlanKey): Promise<{ success: true }> {
    return this.service.deletePlan(key);
  }
}
