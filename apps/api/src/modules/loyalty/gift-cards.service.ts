import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type GiftCard,
  GiftCardStatus,
  type GiftCardTransaction,
  type Prisma,
} from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateGiftCardDto } from './dto/create-gift-card.dto';
import { type QueryGiftCardsDto } from './dto/query-gift-cards.dto';
import { type RedeemGiftCardDto } from './dto/redeem-gift-card.dto';

/** Attempts to mint a unique code before giving up. */
const CODE_GENERATION_ATTEMPTS = 10;

/** Una tarjeta del listado del panel, con quién la compró y qué regala. */
export type TarjetaListado = GiftCard & {
  purchasedBy: { id: string; name: string; phone: string | null } | null;
  service: { id: string; name: string } | null;
};

/** Lo que se enseña de una tarjeta a quien abre su enlace, sin datos de nadie. */
export interface TarjetaPublica {
  code: string;
  design: string;
  recipientName: string | null;
  senderName: string | null;
  serviceName: string | null;
  initialAmount: number;
  balance: number;
  currency: string;
  status: GiftCardStatus;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Gift cards domain service (SPEC §6/§7). A gift card carries a monetary balance
 * (cents) identified by a per-salon unique `code`; it can be redeemed against
 * its balance until depleted (`REDEEMED`) or expired. All operations are
 * tenant-scoped (SPEC §3) on top of the Prisma tenant middleware; single-row
 * writes act on ids already verified to belong to the salon.
 */
@Injectable()
export class GiftCardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Issues/sells a gift card, generating a unique code when none is given. */
  async create(tenantId: string, dto: CreateGiftCardDto): Promise<GiftCard> {
    if (dto.purchasedByClientId) {
      await this.assertClientExists(tenantId, dto.purchasedByClientId);
    }
    if (dto.serviceId) {
      await this.assertServiceExists(tenantId, dto.serviceId);
    }
    const code = dto.code
      ? await this.assertCodeAvailable(tenantId, dto.code.trim().toUpperCase())
      : await this.generateUniqueCode(tenantId);

    return this.prisma.giftCard.create({
      data: {
        tenantId,
        code,
        publicToken: randomBytes(32).toString('hex'),
        initialAmount: dto.initialAmount,
        balance: dto.initialAmount,
        currency: dto.currency ?? 'EUR',
        purchasedByClientId: dto.purchasedByClientId ?? null,
        recipientName: dto.recipientName?.trim() || null,
        senderName: dto.senderName?.trim() || null,
        serviceId: dto.serviceId ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        design: dto.design ?? 'ciruela',
        status: GiftCardStatus.ACTIVE,
      },
    });
  }

  /**
   * Vista pública de una tarjeta: la que abre quien recibe el enlace.
   *
   * Se busca por `publicToken` y no por el código. El código es corto porque se
   * teclea en el mostrador, y eso lo hace rastreable a fuerza bruta; el token
   * son 256 bits y no se puede adivinar. Devuelve solo lo que va impreso en la
   * tarjeta, nunca a quién se la compraron ni quién la ha usado, porque esta
   * consulta no pide sesión.
   */
  async getPublicByToken(tenantId: string, token: string): Promise<TarjetaPublica> {
    const card = await this.prisma.giftCard.findFirst({
      where: { tenantId, publicToken: token.trim() },
      include: { service: { select: { name: true } } },
    });
    if (!card) {
      throw new NotFoundException('Tarjeta regalo no encontrada');
    }
    const caducada = Boolean(card.expiresAt && card.expiresAt.getTime() < Date.now());
    return {
      code: card.code,
      design: card.design,
      recipientName: card.recipientName,
      senderName: card.senderName,
      serviceName: card.service?.name ?? null,
      initialAmount: card.initialAmount,
      balance: card.balance,
      currency: card.currency,
      status: caducada && card.status === GiftCardStatus.ACTIVE ? GiftCardStatus.EXPIRED : card.status,
      expiresAt: card.expiresAt ? card.expiresAt.toISOString() : null,
      createdAt: card.createdAt.toISOString(),
    };
  }

  /**
   * Listado del panel, filtrable por estado.
   *
   * Trae quién la compró y qué servicio se regaló: un listado de códigos y
   * saldos no le dice a la dueña de quién es cada tarjeta ni qué prometió.
   */
  async list(tenantId: string, query: QueryGiftCardsDto): Promise<PaginatedResult<TarjetaListado>> {
    const where: Prisma.GiftCardWhereInput = { tenantId };
    if (query.status !== undefined) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
        include: {
          purchasedBy: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true } },
        },
      }),
      this.prisma.giftCard.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /** Fetches a gift card by id (tenant-scoped). */
  async get(tenantId: string, id: string): Promise<GiftCard> {
    return this.getBase(tenantId, id);
  }

  /** Looks up a gift card by its code to check balance/status at checkout. */
  async getByCode(tenantId: string, code: string): Promise<GiftCard> {
    const card = await this.prisma.giftCard.findFirst({
      where: { tenantId, code: code.trim().toUpperCase() },
    });
    if (!card) {
      throw new NotFoundException('Tarjeta regalo no encontrada');
    }
    return card;
  }

  /**
   * Redeems `amount` (cents) against a card's balance. Marks the card
   * `REDEEMED` when the balance reaches zero. Rejects amounts exceeding the
   * balance, non-`ACTIVE` cards, and expired cards.
   */
  async redeem(
    tenantId: string,
    id: string,
    dto: RedeemGiftCardDto,
    userId?: string,
  ): Promise<GiftCard> {
    const card = await this.getBase(tenantId, id);

    if (card.status !== GiftCardStatus.ACTIVE) {
      throw new BadRequestException('La tarjeta regalo no está activa');
    }
    if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
      await this.prisma.giftCard.update({
        where: { id },
        data: { status: GiftCardStatus.EXPIRED },
      });
      throw new BadRequestException('La tarjeta regalo ha caducado');
    }
    if (dto.redeemedByClientId) {
      await this.assertClientExists(tenantId, dto.redeemedByClientId);
    }
    if (dto.amount > card.balance) {
      throw new BadRequestException('El importe supera el saldo disponible');
    }

    const balance = card.balance - dto.amount;
    const status = balance <= 0 ? GiftCardStatus.REDEEMED : GiftCardStatus.ACTIVE;

    // El saldo y su movimiento van en la misma transacción: si se guardara solo
    // el saldo, un descuento equivocado sería imposible de rastrear.
    const [actualizada] = await this.prisma.$transaction([
      this.prisma.giftCard.update({
        where: { id },
        data: {
          balance,
          status,
          redeemedByClientId: dto.redeemedByClientId ?? card.redeemedByClientId,
        },
      }),
      this.prisma.giftCardTransaction.create({
        data: {
          tenantId,
          giftCardId: id,
          amount: -dto.amount,
          balance,
          reason: dto.reason ?? null,
          clientId: dto.redeemedByClientId ?? null,
          userId: userId ?? null,
        },
      }),
    ]);
    return actualizada;
  }

  /**
   * Deshace un descuento: devuelve el importe al saldo y deja constancia.
   *
   * Descontar de más pasa —un cero de sobra, la tarjeta equivocada—, y sin esto
   * la única salida era editar la base a mano.
   */
  async refund(
    tenantId: string,
    id: string,
    amount: number,
    reason?: string,
    userId?: string,
  ): Promise<GiftCard> {
    const card = await this.getBase(tenantId, id);
    if (card.status === GiftCardStatus.CANCELLED) {
      throw new BadRequestException('La tarjeta está anulada');
    }
    if (amount <= 0) {
      throw new BadRequestException('El importe a devolver debe ser mayor que cero');
    }
    const devuelto = card.initialAmount - card.balance;
    if (amount > devuelto) {
      throw new BadRequestException('No se puede devolver más de lo que se ha gastado');
    }

    const balance = card.balance + amount;
    const [actualizada] = await this.prisma.$transaction([
      this.prisma.giftCard.update({
        where: { id },
        data: { balance, status: GiftCardStatus.ACTIVE },
      }),
      this.prisma.giftCardTransaction.create({
        data: {
          tenantId,
          giftCardId: id,
          amount,
          balance,
          reason: reason ?? 'Devolución de un descuento',
          userId: userId ?? null,
        },
      }),
    ]);
    return actualizada;
  }

  /** Movimientos de una tarjeta, del más reciente al más antiguo. */
  async transactions(tenantId: string, id: string): Promise<GiftCardTransaction[]> {
    await this.getBase(tenantId, id);
    return this.prisma.giftCardTransaction.findMany({
      where: { tenantId, giftCardId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Cancels a gift card (no further redemptions possible). */
  async cancel(tenantId: string, id: string): Promise<GiftCard> {
    const card = await this.getBase(tenantId, id);
    if (card.status === GiftCardStatus.CANCELLED) {
      return card;
    }
    return this.prisma.giftCard.update({
      where: { id },
      data: { status: GiftCardStatus.CANCELLED },
    });
  }

  /** Lists the gift cards purchased by the authenticated client. */
  async listMine(tenantId: string, userId: string): Promise<GiftCard[]> {
    const clientId = await this.resolveClientId(tenantId, userId);
    return this.prisma.giftCard.findMany({
      where: { tenantId, purchasedByClientId: clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- helpers ---------------------------------------------------------------

  private async getBase(tenantId: string, id: string): Promise<GiftCard> {
    const card = await this.prisma.giftCard.findFirst({ where: { id, tenantId } });
    if (!card) {
      throw new NotFoundException('Tarjeta regalo no encontrada');
    }
    return card;
  }

  /** Ensures a caller-supplied code is free within the salon; returns it normalised. */
  private async assertCodeAvailable(tenantId: string, code: string): Promise<string> {
    const existing = await this.prisma.giftCard.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una tarjeta regalo con ese código');
    }
    return code;
  }

  /** Generates a per-salon unique gift-card code. */
  private async generateUniqueCode(tenantId: string): Promise<string> {
    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const code = `GC-${randomBytes(5).toString('hex').toUpperCase()}`;
      const existing = await this.prisma.giftCard.findFirst({
        where: { tenantId, code },
        select: { id: true },
      });
      if (!existing) {
        return code;
      }
    }
    throw new ConflictException('No se pudo generar un código único para la tarjeta regalo');
  }

  /** El servicio regalado tiene que ser de este salón. */
  private async assertServiceExists(tenantId: string, serviceId: string): Promise<void> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
      select: { id: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
  }

  private async assertClientExists(tenantId: string, clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
    if (!client) {
      throw new BadRequestException('La clienta indicada no existe en este salón');
    }
  }

  private async resolveClientId(tenantId: string, userId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    if (!client) {
      throw new ForbiddenException('No hay una ficha de clienta asociada a tu cuenta');
    }
    return client.id;
  }
}
