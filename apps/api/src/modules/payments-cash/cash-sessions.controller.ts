import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type CashSession } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId } from '../../tenancy/decorators';

import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { PaymentsCashService } from './payments-cash.service';
import { requireTenant } from './require-tenant';

/**
 * Cash session lifecycle — open (opening float), close (counted vs expected =
 * difference) and current/list — tenant-scoped and role-gated (SPEC §6/§7).
 */
@ApiTags('cash-sessions')
@Controller('cash-sessions')
export class CashSessionsController {
  constructor(private readonly service: PaymentsCashService) {}

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abre una sesión de caja con un fondo inicial.' })
  open(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: OpenCashSessionDto,
  ): Promise<CashSession> {
    return this.service.openCashSession(requireTenant(tenantId), userId, dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierra la sesión de caja abierta y calcula la diferencia.' })
  close(
    @TenantId() tenantId: string | null,
    @Body() dto: CloseCashSessionDto,
  ): Promise<CashSession> {
    return this.service.closeCashSession(requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('current')
  @ApiOperation({ summary: 'Devuelve la sesión de caja abierta (o null).' })
  current(@TenantId() tenantId: string | null): Promise<CashSession | null> {
    return this.service.currentCashSession(requireTenant(tenantId));
  }

  @Roles('OWNER', 'MANAGER')
  @Get()
  @ApiOperation({ summary: 'Lista las últimas sesiones de caja.' })
  list(@TenantId() tenantId: string | null): Promise<CashSession[]> {
    return this.service.listCashSessions(requireTenant(tenantId));
  }
}
