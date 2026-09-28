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
import { type LoyaltyCard, type LoyaltyTransaction } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { AddStampDto } from './dto/add-stamp.dto';
import { CreateLoyaltyCardDto } from './dto/create-loyalty-card.dto';
import { QueryLoyaltyCardsDto } from './dto/query-loyalty-cards.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { LoyaltyService, type LoyaltyCardWithTransactions } from './loyalty.service';

/**
 * Loyalty stamp cards (SPEC §4/§7). Staff (OWNER/MANAGER/EMPLOYEE) manage cards,
 * add stamps on completed services and redeem free rewards; a CLIENT reads only
 * their own card via `/loyalty/me`. All routes are tenant-scoped.
 */
@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Roles('CLIENT')
  @Get('me')
  @ApiOperation({ summary: 'Tarjeta de fidelización de la clienta autenticada.' })
  me(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
  ): Promise<LoyaltyCardWithTransactions> {
    return this.loyalty.getMyCard(this.requireTenant(tenantId), userId);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('cards')
  @ApiOperation({ summary: 'Lista paginada de tarjetas de fidelización (admin).' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryLoyaltyCardsDto,
  ): Promise<PaginatedResult<LoyaltyCard>> {
    return this.loyalty.listCards(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abre una tarjeta de fidelización para una clienta.' })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateLoyaltyCardDto,
  ): Promise<LoyaltyCard> {
    return this.loyalty.createCard(this.requireTenant(tenantId), dto.clientId);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('cards/:id')
  @ApiOperation({ summary: 'Obtiene una tarjeta con sus últimos movimientos.' })
  get(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<LoyaltyCardWithTransactions> {
    return this.loyalty.getCard(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('cards/:id/transactions')
  @ApiOperation({ summary: 'Historial de movimientos de una tarjeta.' })
  transactions(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<LoyaltyTransaction[]> {
    return this.loyalty.listCardTransactions(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('cards/:id/stamp')
  @ApiOperation({ summary: 'Añade sellos (servicio completado). Cada 10 → 1 gratis.' })
  stamp(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: AddStampDto,
  ): Promise<LoyaltyCard> {
    return this.loyalty.addStamps(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('cards/:id/unstamp')
  @ApiOperation({ summary: 'Quita un sello puesto por error.' })
  removeStamp(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<LoyaltyCard> {
    return this.loyalty.removeStamp(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('cards/:id/redeem')
  @ApiOperation({ summary: 'Canjea una recompensa gratuita disponible.' })
  redeem(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: RedeemRewardDto,
  ): Promise<LoyaltyCard> {
    return this.loyalty.redeemReward(this.requireTenant(tenantId), id, dto);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
