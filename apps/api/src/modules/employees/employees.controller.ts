import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type Commission,
  type Employee,
  type TimeOff,
  type WorkingHours,
} from '@prisma/client';

import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import {
  type CommissionCalculationResult,
  type EmployeePerformance,
  EmployeesService,
  type PublicTeamMember,
} from './employees.service';
import {
  CalculateCommissionsDto,
  CommissionsQueryDto,
} from './dto/commissions-query.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import {
  CreateEmployeeWorkingHoursDto,
  UpdateEmployeeWorkingHoursDto,
} from './dto/employee-schedule.dto';
import {
  CreateEmployeeTimeOffDto,
  UpdateEmployeeTimeOffDto,
} from './dto/employee-time-off.dto';
import { PerformanceQueryDto } from './dto/performance-query.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

/**
 * Employees (professionals) administration. All routes are tenant-scoped
 * (SPEC §3). Reads are open to `EMPLOYEE` and above; writes and financial data
 * (salary, commissions, performance) require `MANAGER` or above (SPEC §4/§7).
 * The public bookable-team listing is `@Public()`. `SUPERADMIN` is always
 * allowed by the global `RolesGuard`.
 */
@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Public()
  @Get('public/team')
  @ApiOperation({ summary: 'Equipo reservable del salón (web pública).' })
  listPublicTeam(@TenantId() tenantId: string | null): Promise<PublicTeamMember[]> {
    return this.employees.listPublicTeam(this.requireTenant(tenantId));
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un profesional.' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreateEmployeeDto): Promise<Employee> {
    return this.employees.create(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de profesionales, con filtros y búsqueda.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryEmployeesDto,
  ): Promise<PaginatedResult<Employee>> {
    return this.employees.list(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un profesional por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Employee> {
    return this.employees.getEmployee(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un profesional.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<Employee> {
    return this.employees.update(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un profesional.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.employees.remove(this.requireTenant(tenantId), id);
  }

  // --- Schedule (WorkingHours) ----------------------------------------------

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id/schedule')
  @ApiOperation({ summary: 'Horario semanal del profesional.' })
  listSchedule(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<WorkingHours[]> {
    return this.employees.listSchedule(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/schedule')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Añade un tramo de horario al profesional.' })
  addSchedule(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: CreateEmployeeWorkingHoursDto,
  ): Promise<WorkingHours> {
    return this.employees.addSchedule(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id/schedule/:workingHoursId')
  @ApiOperation({ summary: 'Actualiza un tramo de horario del profesional.' })
  updateSchedule(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Param('workingHoursId') workingHoursId: string,
    @Body() dto: UpdateEmployeeWorkingHoursDto,
  ): Promise<WorkingHours> {
    return this.employees.updateSchedule(this.requireTenant(tenantId), id, workingHoursId, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id/schedule/:workingHoursId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un tramo de horario del profesional.' })
  async removeSchedule(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Param('workingHoursId') workingHoursId: string,
  ): Promise<void> {
    await this.employees.removeSchedule(this.requireTenant(tenantId), id, workingHoursId);
  }

  // --- Time off --------------------------------------------------------------

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id/time-off')
  @ApiOperation({ summary: 'Permisos/ausencias del profesional.' })
  listTimeOff(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<TimeOff[]> {
    return this.employees.listTimeOff(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post(':id/time-off')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un permiso/ausencia para el profesional.' })
  addTimeOff(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: CreateEmployeeTimeOffDto,
  ): Promise<TimeOff> {
    return this.employees.addTimeOff(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id/time-off/:timeOffId')
  @ApiOperation({ summary: 'Actualiza/aprueba/rechaza un permiso del profesional.' })
  updateTimeOff(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Param('timeOffId') timeOffId: string,
    @Body() dto: UpdateEmployeeTimeOffDto,
  ): Promise<TimeOff> {
    return this.employees.updateTimeOff(this.requireTenant(tenantId), id, timeOffId, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id/time-off/:timeOffId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un permiso del profesional.' })
  async removeTimeOff(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Param('timeOffId') timeOffId: string,
  ): Promise<void> {
    await this.employees.removeTimeOff(this.requireTenant(tenantId), id, timeOffId);
  }

  // --- Commissions -----------------------------------------------------------

  @Roles('OWNER', 'MANAGER')
  @Get(':id/commissions')
  @ApiOperation({ summary: 'Comisiones del profesional (opcionalmente por periodo/estado).' })
  listCommissions(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Query() query: CommissionsQueryDto,
  ): Promise<Commission[]> {
    return this.employees.listCommissions(
      this.requireTenant(tenantId),
      id,
      query.period,
      query.status,
    );
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/commissions/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calcula las comisiones del periodo a partir de las citas COMPLETED (idempotente).',
  })
  calculateCommissions(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: CalculateCommissionsDto,
  ): Promise<CommissionCalculationResult> {
    return this.employees.calculateCommissions(this.requireTenant(tenantId), id, dto.period);
  }

  // --- Performance -----------------------------------------------------------

  @Roles('OWNER', 'MANAGER')
  @Get(':id/performance')
  @ApiOperation({ summary: 'Rendimiento del profesional (nº de citas e ingresos).' })
  performance(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Query() query: PerformanceQueryDto,
  ): Promise<EmployeePerformance> {
    return this.employees.performance(this.requireTenant(tenantId), id, query.from, query.to);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
