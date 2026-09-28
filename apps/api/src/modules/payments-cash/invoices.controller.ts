import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Invoice } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { type PublicTicket } from './payments-cash.service';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PaymentsCashService } from './payments-cash.service';
import { requireTenant } from './require-tenant';

/**
 * Invoices with per-tenant sequential numbering (SPEC §6). Tenant-scoped and
 * gated by role; totals are computed server-side from the submitted items.
 */
@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: PaymentsCashService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una factura con numeración secuencial por salón.' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreateInvoiceDto): Promise<Invoice> {
    return this.service.createInvoice(requireTenant(tenantId), dto);
  }

  /**
   * Ticket público: lo abre quien tenga el enlace, sin cuenta.
   *
   * Es lo que Aurora manda por WhatsApp. El token es la credencial, así que va
   * marcado `@Public()` y devuelve sólo lo que se imprime en un recibo.
   */
  @Public()
  @Get('ticket/:token')
  @ApiOperation({ summary: 'Ticket de una factura emitida, por su enlace público.' })
  publicTicket(@Param('token') token: string): Promise<PublicTicket> {
    return this.service.findPublicTicket(token);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id/share')
  @ApiOperation({ summary: 'Devuelve (creándolo si hace falta) el enlace público del ticket.' })
  async share(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<{ token: string }> {
    return { token: await this.service.ensurePublicToken(requireTenant(tenantId), id) };
  }

  // Literal antes de `:id`, o `me` se tomaría por el id de una factura.
  @Roles('CLIENT')
  @Get('me')
  @ApiOperation({ summary: 'Facturas de la clienta autenticada (su portal).' })
  listMine(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryInvoicesDto,
  ): Promise<PaginatedResult<Invoice>> {
    return this.service.listMyInvoices(requireTenant(tenantId), userId, query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de facturas, con filtros por estado/cliente.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryInvoicesDto,
  ): Promise<PaginatedResult<Invoice>> {
    return this.service.listInvoices(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una factura por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Invoice> {
    return this.service.getInvoice(requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/issue')
  @ApiOperation({ summary: 'Emite una factura en borrador (DRAFT → ISSUED).' })
  issue(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Invoice> {
    return this.service.issueInvoice(requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza el estado o el PDF de una factura.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    return this.service.updateInvoice(requireTenant(tenantId), id, dto);
  }
}
