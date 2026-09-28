import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type TimeOff, type WorkingHours } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { getCurrentTenantId } from '../../tenancy/tenant-context';

import { type CreateTimeOffDto, type UpdateTimeOffDto } from './dto/time-off.dto';
import {
  type CreateWorkingHoursDto,
  type UpdateWorkingHoursDto,
} from './dto/working-hours.dto';

/**
 * CRUD for the scheduling primitives that drive availability: weekly
 * {@link WorkingHours} (salon-wide or per professional) and {@link TimeOff}
 * periods. All operations are tenant-scoped by the Prisma middleware; single
 * row updates/deletes resolve the row within the tenant first.
 */
@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Working hours ---------------------------------------------------------

  async createWorkingHours(dto: CreateWorkingHoursDto): Promise<WorkingHours> {
    this.assertTimeOrder(dto.startTime, dto.endTime);
    if (dto.employeeId) {
      await this.requireEmployee(dto.employeeId);
    }
    return this.prisma.workingHours.create({
      data: {
        tenantId: this.tenantId(),
        employeeId: dto.employeeId ?? null,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async listWorkingHours(employeeId?: string): Promise<WorkingHours[]> {
    return this.prisma.workingHours.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async updateWorkingHours(id: string, dto: UpdateWorkingHoursDto): Promise<WorkingHours> {
    const current = await this.requireWorkingHours(id);
    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;
    this.assertTimeOrder(startTime, endTime);
    if (dto.employeeId) {
      await this.requireEmployee(dto.employeeId);
    }
    return this.prisma.workingHours.update({
      where: { id },
      data: {
        weekday: dto.weekday ?? current.weekday,
        startTime,
        endTime,
        ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
      },
    });
  }

  async deleteWorkingHours(id: string): Promise<{ id: string }> {
    await this.requireWorkingHours(id);
    await this.prisma.workingHours.delete({ where: { id } });
    return { id };
  }

  // --- Time off --------------------------------------------------------------

  async createTimeOff(dto: CreateTimeOffDto): Promise<TimeOff> {
    await this.requireEmployee(dto.employeeId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertDateOrder(startAt, endAt);
    return this.prisma.timeOff.create({
      data: {
        tenantId: this.tenantId(),
        employeeId: dto.employeeId,
        startAt,
        endAt,
        kind: dto.kind ?? 'VACATION',
        status: dto.status ?? 'PENDING',
      },
    });
  }

  async listTimeOff(employeeId?: string): Promise<TimeOff[]> {
    return this.prisma.timeOff.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: { startAt: 'desc' },
    });
  }

  async updateTimeOff(id: string, dto: UpdateTimeOffDto): Promise<TimeOff> {
    const current = await this.requireTimeOff(id);
    const startAt = dto.startAt ? new Date(dto.startAt) : current.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : current.endAt;
    this.assertDateOrder(startAt, endAt);
    if (dto.employeeId) {
      await this.requireEmployee(dto.employeeId);
    }
    return this.prisma.timeOff.update({
      where: { id },
      data: {
        startAt,
        endAt,
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.kind ? { kind: dto.kind } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async deleteTimeOff(id: string): Promise<{ id: string }> {
    await this.requireTimeOff(id);
    await this.prisma.timeOff.delete({ where: { id } });
    return { id };
  }

  // --- Helpers ---------------------------------------------------------------

  private async requireWorkingHours(id: string): Promise<WorkingHours> {
    const row = await this.prisma.workingHours.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Horario no encontrado');
    }
    return row;
  }

  private async requireTimeOff(id: string): Promise<TimeOff> {
    const row = await this.prisma.timeOff.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Permiso no encontrado');
    }
    return row;
  }

  private async requireEmployee(employeeId: string): Promise<void> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Profesional no encontrado');
    }
  }

  /** Current tenant id from the request context (throws if unresolved). */
  private tenantId(): string {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }

  private assertTimeOrder(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime debe ser anterior a endTime');
    }
  }

  private assertDateOrder(startAt: Date, endAt: Date): void {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }
    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException('startAt debe ser anterior a endAt');
    }
  }
}
