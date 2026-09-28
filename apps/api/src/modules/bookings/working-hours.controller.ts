import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type WorkingHours } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';

import { ScheduleService } from './schedule.service';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
} from './dto/working-hours.dto';

/** CRUD for weekly working hours (salon-wide or per professional). SPEC §7. */
@ApiTags('bookings')
@Roles('OWNER', 'MANAGER')
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un tramo de horario laboral.' })
  create(@Body() dto: CreateWorkingHoursDto): Promise<WorkingHours> {
    return this.scheduleService.createWorkingHours(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los horarios laborales (opcionalmente por profesional).' })
  list(@Query('employeeId') employeeId?: string): Promise<WorkingHours[]> {
    return this.scheduleService.listWorkingHours(employeeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un tramo de horario laboral.' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkingHoursDto): Promise<WorkingHours> {
    return this.scheduleService.updateWorkingHours(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un tramo de horario laboral.' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.scheduleService.deleteWorkingHours(id);
  }
}
