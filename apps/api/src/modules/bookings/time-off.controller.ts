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
import { type TimeOff } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';

import { ScheduleService } from './schedule.service';
import { CreateTimeOffDto, UpdateTimeOffDto } from './dto/time-off.dto';

/** CRUD for professional time-off periods (vacation, sick leave, ...). SPEC §7. */
@ApiTags('bookings')
@Roles('OWNER', 'MANAGER', 'EMPLOYEE')
@Controller('time-off')
export class TimeOffController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un permiso/ausencia para un profesional.' })
  create(@Body() dto: CreateTimeOffDto): Promise<TimeOff> {
    return this.scheduleService.createTimeOff(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los permisos (opcionalmente por profesional).' })
  list(@Query('employeeId') employeeId?: string): Promise<TimeOff[]> {
    return this.scheduleService.listTimeOff(employeeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza/aprueba/rechaza un permiso.' })
  update(@Param('id') id: string, @Body() dto: UpdateTimeOffDto): Promise<TimeOff> {
    return this.scheduleService.updateTimeOff(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un permiso.' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.scheduleService.deleteTimeOff(id);
  }
}
