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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Expense } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PaymentsCashService } from './payments-cash.service';
import { requireTenant } from './require-tenant';

/** Expenses CRUD, tenant-scoped and gated by role (SPEC §6/§7). */
@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: PaymentsCashService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un gasto.' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreateExpenseDto): Promise<Expense> {
    return this.service.createExpense(requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de gastos, con filtros por categoría/fechas.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryExpensesDto,
  ): Promise<PaginatedResult<Expense>> {
    return this.service.listExpenses(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un gasto por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Expense> {
    return this.service.getExpense(requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un gasto.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.service.updateExpense(requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un gasto.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.service.deleteExpense(requireTenant(tenantId), id);
  }
}
