import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuleActivation, Role, SupportTicket } from '@prisma/client';

import { type PaginatedResult } from '../../common/pagination.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type AuthenticatedUser } from '../../auth/auth.types';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { ModuleActivationDto } from './dto/module-activation.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  type AdminActor,
  type GlobalStats,
  type ImpersonationToken,
  SuperadminService,
  type TenantMetrics,
} from './superadmin.service';

/**
 * Platform Super Admin endpoints (SPEC §7 — `superadmin`). Every route is
 * mounted under the global `/api/v1` prefix at `/admin/*` and restricted to
 * `SUPERADMIN`. Covers salon metrics, global stats, tenant impersonation for
 * support, support-ticket CRUD and per-tenant module activation.
 */
@ApiTags('superadmin')
@Roles(Role.SUPERADMIN)
@Controller('admin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  // --- Salons with metrics ---------------------------------------------------

  @Get('tenants')
  @ApiOperation({ summary: 'Lista todos los salones con métricas de uso.' })
  listTenants(@Query() query: ListTenantsDto): Promise<PaginatedResult<TenantMetrics>> {
    return this.superadminService.listTenants(query);
  }

  // --- Global stats ----------------------------------------------------------

  @Get('stats')
  @ApiOperation({ summary: 'KPIs globales de la plataforma (salones, MRR aprox, citas).' })
  getStats(): Promise<GlobalStats> {
    return this.superadminService.getGlobalStats();
  }

  // --- Impersonation ---------------------------------------------------------

  @Post('impersonate/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emite un token de soporte acotado a un salón (registra AuditLog).' })
  impersonate(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImpersonationToken> {
    return this.superadminService.impersonate(tenantId, this.actor(user));
  }

  // --- Support tickets (CRUD) ------------------------------------------------

  @Get('tickets')
  @ApiOperation({ summary: 'Lista paginada de incidencias de todos los salones.' })
  listTickets(@Query() query: ListTicketsDto): Promise<PaginatedResult<SupportTicket>> {
    return this.superadminService.listTickets(query);
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abre una incidencia para un salón.' })
  createTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupportTicket> {
    return this.superadminService.createTicket(dto, this.actor(user));
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Obtiene una incidencia por id.' })
  getTicket(@Param('id') id: string): Promise<SupportTicket> {
    return this.superadminService.getTicket(id);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Actualiza el estado/prioridad/texto de una incidencia.' })
  updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ): Promise<SupportTicket> {
    return this.superadminService.updateTicket(id, dto);
  }

  @Delete('tickets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una incidencia.' })
  async removeTicket(@Param('id') id: string): Promise<void> {
    await this.superadminService.removeTicket(id);
  }

  // --- Module activation per tenant ------------------------------------------

  @Get('tenants/:tenantId/modules')
  @ApiOperation({ summary: 'Lista los módulos activados de un salón.' })
  listModules(@Param('tenantId') tenantId: string): Promise<ModuleActivation[]> {
    return this.superadminService.listModules(tenantId);
  }

  @Put('tenants/:tenantId/modules')
  @ApiOperation({ summary: 'Activa o desactiva un módulo de un salón.' })
  setModule(
    @Param('tenantId') tenantId: string,
    @Body() dto: ModuleActivationDto,
  ): Promise<ModuleActivation> {
    return this.superadminService.setModule(tenantId, dto);
  }

  // --- helpers ---------------------------------------------------------------

  /** Projects the authenticated SUPERADMIN into an audit-trail actor. */
  private actor(user: AuthenticatedUser): AdminActor {
    return { userId: user.userId, email: user.email };
  }
}
