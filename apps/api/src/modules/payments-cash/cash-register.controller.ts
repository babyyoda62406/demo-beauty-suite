import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId } from '../../tenancy/decorators';

import { CashRegisterSummaryQueryDto } from './dto/cash-register-summary.dto';
import { type CashRegisterSummary, PaymentsCashService } from './payments-cash.service';
import { requireTenant } from './require-tenant';

/** Daily cash register summary (income by method vs expenses) — SPEC §6/§7. */
@ApiTags('cash-register')
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly service: PaymentsCashService) {}

  @Roles('OWNER', 'MANAGER')
  @Get('summary')
  @ApiOperation({ summary: 'Resumen de caja de un día (ingresos por método y gastos).' })
  summary(
    @TenantId() tenantId: string | null,
    @Query() query: CashRegisterSummaryQueryDto,
  ): Promise<CashRegisterSummary> {
    return this.service.cashRegisterSummary(requireTenant(tenantId), query.date);
  }
}
