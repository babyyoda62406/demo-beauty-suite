import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId } from '../../tenancy/decorators';

import { RevenueQueryDto } from './dto/revenue-query.dto';
import { StatsRangeDto } from './dto/stats-range.dto';
import { TopServicesQueryDto } from './dto/top-services-query.dto';
import {
  StatsService,
  type CancellationStats,
  type EmployeeStat,
  type PeakHoursStats,
  type RevenueSeries,
  type StatsOverview,
  type TopServiceStat,
} from './stats.service';

/**
 * Read-only aggregated statistics for the salon dashboard (SPEC §7 `stats`).
 * Every endpoint is tenant-scoped (SPEC §3) and restricted to `MANAGER` and
 * above; `SUPERADMIN` is always allowed by the global `RolesGuard`. Responses
 * are shaped as chart-ready `{label,value}` series.
 */
@ApiTags('stats')
@Controller('stats')
@Roles('OWNER', 'MANAGER')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'KPIs del periodo: facturación, nº de citas, clientes nuevos vs recurrentes y ticket medio.',
  })
  overview(
    @TenantId() tenantId: string | null,
    @Query() query: StatsRangeDto,
  ): Promise<StatsOverview> {
    return this.stats.overview(this.requireTenant(tenantId), query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Serie temporal de facturación por granularidad (día/semana/mes).' })
  revenue(
    @TenantId() tenantId: string | null,
    @Query() query: RevenueQueryDto,
  ): Promise<RevenueSeries> {
    return this.stats.revenue(this.requireTenant(tenantId), query);
  }

  @Get('top-services')
  @ApiOperation({ summary: 'Ranking de servicios más reservados en el periodo.' })
  topServices(
    @TenantId() tenantId: string | null,
    @Query() query: TopServicesQueryDto,
  ): Promise<TopServiceStat[]> {
    return this.stats.topServices(this.requireTenant(tenantId), query);
  }

  @Get('peak-hours')
  @ApiOperation({ summary: 'Volumen de citas por hora del día (franjas de mayor demanda).' })
  peakHours(
    @TenantId() tenantId: string | null,
    @Query() query: StatsRangeDto,
  ): Promise<PeakHoursStats> {
    return this.stats.peakHours(this.requireTenant(tenantId), query);
  }

  @Get('cancellations')
  @ApiOperation({ summary: 'Cancelaciones y ausencias (no-show) del periodo con sus tasas.' })
  cancellations(
    @TenantId() tenantId: string | null,
    @Query() query: StatsRangeDto,
  ): Promise<CancellationStats> {
    return this.stats.cancellations(this.requireTenant(tenantId), query);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Productividad por empleada: citas atendidas y facturación en el periodo.' })
  employees(
    @TenantId() tenantId: string | null,
    @Query() query: StatsRangeDto,
  ): Promise<EmployeeStat[]> {
    return this.stats.employees(this.requireTenant(tenantId), query);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
