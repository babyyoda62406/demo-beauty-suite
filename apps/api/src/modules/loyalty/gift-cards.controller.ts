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
import { type GiftCard, type GiftCardTransaction } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { QueryGiftCardsDto } from './dto/query-gift-cards.dto';
import { RedeemGiftCardDto } from './dto/redeem-gift-card.dto';
import { RefundGiftCardDto } from './dto/refund-gift-card.dto';
import {
  GiftCardsService,
  type TarjetaListado,
  type TarjetaPublica,
} from './gift-cards.service';

/**
 * Gift cards endpoints (SPEC §4/§7). Staff issue, look up, redeem and cancel
 * cards; a CLIENT lists the cards they purchased via `/gift-cards/me`. Static
 * routes (`me`, `code/:code`) are declared before `:id` so they match literally.
 * All routes are tenant-scoped.
 */
@ApiTags('gift-cards')
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly giftCards: GiftCardsService) {}

  @Roles('CLIENT')
  @Get('me')
  @ApiOperation({ summary: 'Tarjetas regalo compradas por la clienta autenticada.' })
  mine(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
  ): Promise<GiftCard[]> {
    return this.giftCards.listMine(this.requireTenant(tenantId), userId);
  }

  @Public()
  @Get('public/:token')
  @ApiOperation({
    summary: 'Vista pública de una tarjeta por el secreto de su enlace.',
    description:
      'Se busca por el token largo, no por el código corto del mostrador: ese es adivinable a fuerza bruta.',
  })
  publica(
    @TenantId() tenantId: string | null,
    @Param('token') token: string,
  ): Promise<TarjetaPublica> {
    return this.giftCards.getPublicByToken(this.requireTenant(tenantId), token);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('code/:code')
  @ApiOperation({ summary: 'Consulta saldo/estado de una tarjeta regalo por código.' })
  byCode(
    @TenantId() tenantId: string | null,
    @Param('code') code: string,
  ): Promise<GiftCard> {
    return this.giftCards.getByCode(this.requireTenant(tenantId), code);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de tarjetas regalo (admin), con filtros.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryGiftCardsDto,
  ): Promise<PaginatedResult<TarjetaListado>> {
    return this.giftCards.list(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Emite/vende una tarjeta regalo (código único).' })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateGiftCardDto,
  ): Promise<GiftCard> {
    return this.giftCards.create(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una tarjeta regalo por id.' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<GiftCard> {
    return this.giftCards.get(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post(':id/redeem')
  @ApiOperation({ summary: 'Canjea un importe contra el saldo de la tarjeta.' })
  redeem(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: RedeemGiftCardDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GiftCard> {
    return this.giftCards.redeem(this.requireTenant(tenantId), id, dto, userId);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deshace un descuento y devuelve el importe al saldo.' })
  refund(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: RefundGiftCardDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GiftCard> {
    return this.giftCards.refund(this.requireTenant(tenantId), id, dto.amount, dto.reason, userId);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id/movimientos')
  @ApiOperation({ summary: 'Historial de movimientos de saldo de una tarjeta.' })
  movimientos(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<GiftCardTransaction[]> {
    return this.giftCards.transactions(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancela una tarjeta regalo.' })
  cancel(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<GiftCard> {
    return this.giftCards.cancel(this.requireTenant(tenantId), id);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
