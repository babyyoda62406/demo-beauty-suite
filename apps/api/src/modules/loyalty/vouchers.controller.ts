import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreateVoucherDto } from './dto/create-voucher.dto';
import { QueryVouchersDto } from './dto/query-vouchers.dto';
import { VouchersService, type VoucherListado, type VoucherWithBalance } from './vouchers.service';

/**
 * Vouchers (bonos) endpoints (SPEC §4/§7). Staff sell, consume and cancel
 * vouchers; a CLIENT reads only their own via `/vouchers/me`. All routes are
 * tenant-scoped.
 */
@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Roles('CLIENT')
  @Get('me')
  @ApiOperation({ summary: 'Bonos de la clienta autenticada (con saldo de sesiones).' })
  mine(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
  ): Promise<VoucherWithBalance[]> {
    return this.vouchers.listMine(this.requireTenant(tenantId), userId);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de bonos (admin), con filtros.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryVouchersDto,
  ): Promise<PaginatedResult<VoucherListado>> {
    return this.vouchers.list(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vende un bono de N sesiones a una clienta.' })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateVoucherDto,
  ): Promise<VoucherWithBalance> {
    return this.vouchers.create(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un bono con su saldo de sesiones.' })
  get(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<VoucherWithBalance> {
    return this.vouchers.get(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post(':id/consume')
  @ApiOperation({ summary: 'Consume una sesión del bono.' })
  consume(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<VoucherWithBalance> {
    return this.vouchers.consume(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancela un bono.' })
  cancel(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<VoucherWithBalance> {
    return this.vouchers.cancel(this.requireTenant(tenantId), id);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
