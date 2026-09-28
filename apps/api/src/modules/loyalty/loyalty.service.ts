import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type LoyaltyCard, type LoyaltyTransaction, type Prisma } from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type AddStampDto } from './dto/add-stamp.dto';
import { type QueryLoyaltyCardsDto } from './dto/query-loyalty-cards.dto';
import { type RedeemRewardDto } from './dto/redeem-reward.dto';

/** Stamps required to earn one free reward (SPEC — fidelización núcleo). */
export const STAMPS_PER_REWARD = 10;

/** How many recent transactions to embed when reading a single card. */
const CARD_TRANSACTIONS_LIMIT = 50;

/** A loyalty card with its most recent transactions embedded. */
export type LoyaltyCardWithTransactions = LoyaltyCard & { transactions: LoyaltyTransaction[] };

/**
 * Loyalty domain service (SPEC §6/§7 — fidelización). One stamp card per client
 * (`unique(tenantId, clientId)`): every completed service adds a stamp, and
 * every {@link STAMPS_PER_REWARD} stamps convert into one free reward
 * (`freeEarned`). Redeeming a reward records a {@link LoyaltyTransaction}.
 *
 * All operations are strictly tenant-scoped (SPEC §3): cards are resolved by
 * `tenantId` on top of the Prisma tenant middleware, and single-row writes act
 * on ids already verified to belong to the salon (the middleware cannot scope
 * unique-`where` writes — see `PrismaService`). `LoyaltyTransaction` is a child
 * of `LoyaltyCard` and inherits isolation through it.
 */
@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Cards (staff) ---------------------------------------------------------

  /** Opens a loyalty card for a client. Fails if one already exists. */
  async createCard(tenantId: string, clientId: string): Promise<LoyaltyCard> {
    await this.assertClientExists(tenantId, clientId);
    const existing = await this.prisma.loyaltyCard.findFirst({
      where: { tenantId, clientId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('La clienta ya tiene una tarjeta de fidelización');
    }
    return this.prisma.loyaltyCard.create({ data: { tenantId, clientId } });
  }

  /** Admin paginated listing of loyalty cards, optionally filtered by client. */
  async listCards(
    tenantId: string,
    query: QueryLoyaltyCardsDto,
  ): Promise<PaginatedResult<LoyaltyCard>> {
    const where: Prisma.LoyaltyCardWhereInput = { tenantId };
    if (query.clientId !== undefined) where.clientId = query.clientId;
    // Buscar por la clienta, que es como se busca una tarjeta de verdad.
    if (query.search) {
      const search = query.search.trim();
      where.client = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.loyaltyCard.findMany({
        where,
        // Sin la clienta, el panel solo podía escribir «Clienta» en cada tarjeta.
        include: { client: { select: { id: true, name: true, phone: true } } },
        orderBy: { updatedAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.loyaltyCard.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /** Fetches a card (tenant-scoped) with its most recent transactions. */
  async getCard(tenantId: string, id: string): Promise<LoyaltyCardWithTransactions> {
    const card = await this.prisma.loyaltyCard.findFirst({
      where: { id, tenantId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: CARD_TRANSACTIONS_LIMIT },
      },
    });
    if (!card) {
      throw new NotFoundException('Tarjeta de fidelización no encontrada');
    }
    return card;
  }

  /** Lists the transactions of a card (tenant-scoped through the card). */
  async listCardTransactions(tenantId: string, id: string): Promise<LoyaltyTransaction[]> {
    await this.getCardBase(tenantId, id);
    return this.prisma.loyaltyTransaction.findMany({
      where: { cardId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Adds stamps to a card and rolls every {@link STAMPS_PER_REWARD} stamps into
   * a free reward. Records a positive-delta transaction, optionally linked to
   * the completed booking that earned it.
   */
  async addStamps(tenantId: string, id: string, dto: AddStampDto): Promise<LoyaltyCard> {
    const card = await this.getCardBase(tenantId, id);
    const count = dto.count ?? 1;
    const bookingId = await this.resolveBookingId(tenantId, dto.bookingId);

    const total = card.stamps + count;
    const freeGained = Math.floor(total / STAMPS_PER_REWARD);
    const remainingStamps = total % STAMPS_PER_REWARD;

    const [updated] = await this.prisma.$transaction([
      this.prisma.loyaltyCard.update({
        where: { id },
        data: {
          stamps: remainingStamps,
          freeEarned: { increment: freeGained },
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          cardId: id,
          bookingId,
          delta: count,
          reason: dto.reason?.trim() || 'SERVICE_COMPLETED',
        },
      }),
    ]);
    return updated;
  }

  /**
   * Deshace un sello puesto por error.
   *
   * Si la tarjeta acababa de completarse, además de restar el sello devuelve el
   * premio a su estado anterior: sin esto, un clic equivocado regalaría un
   * servicio. Nunca baja de cero.
   */
  async removeStamp(tenantId: string, id: string): Promise<LoyaltyCard> {
    const card = await this.getCardBase(tenantId, id);

    let stamps = card.stamps;
    let freeEarned = card.freeEarned;
    if (stamps > 0) {
      stamps -= 1;
    } else if (freeEarned > 0) {
      // El último sello cerró la tarjeta: se deshace ese cierre.
      freeEarned -= 1;
      stamps = STAMPS_PER_REWARD - 1;
    } else {
      throw new BadRequestException('La tarjeta no tiene sellos que quitar');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.loyaltyCard.update({ where: { id }, data: { stamps, freeEarned } }),
      this.prisma.loyaltyTransaction.create({
        data: { cardId: id, delta: -1, reason: 'STAMP_REVERTED' },
      }),
    ]);
    return updated;
  }

  /**
   * Redeems one earned free reward. Decrements `freeEarned`, increments
   * `redeemedCount`, and records a redemption transaction. Fails when no reward
   * is available.
   */
  async redeemReward(tenantId: string, id: string, dto: RedeemRewardDto): Promise<LoyaltyCard> {
    const card = await this.getCardBase(tenantId, id);
    if (card.freeEarned <= 0) {
      throw new BadRequestException('No hay recompensas gratuitas disponibles para canjear');
    }
    const bookingId = await this.resolveBookingId(tenantId, dto.bookingId);

    const [updated] = await this.prisma.$transaction([
      this.prisma.loyaltyCard.update({
        where: { id },
        data: {
          freeEarned: { decrement: 1 },
          redeemedCount: { increment: 1 },
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          cardId: id,
          bookingId,
          delta: -1,
          reason: dto.reason?.trim() || 'REDEEM_FREE',
        },
      }),
    ]);
    return updated;
  }

  // --- Self service (CLIENT) -------------------------------------------------

  /**
   * Returns the authenticated client's own card (creating an empty one on first
   * access, since the relationship is naturally 1:1), with recent transactions.
   */
  async getMyCard(tenantId: string, userId: string): Promise<LoyaltyCardWithTransactions> {
    const clientId = await this.resolveClientId(tenantId, userId);
    const existing = await this.prisma.loyaltyCard.findFirst({
      where: { tenantId, clientId },
      select: { id: true },
    });
    const cardId = existing
      ? existing.id
      : (await this.prisma.loyaltyCard.create({ data: { tenantId, clientId } })).id;
    return this.getCard(tenantId, cardId);
  }

  // --- helpers ---------------------------------------------------------------

  /** Fetches a card without relations, enforcing tenant ownership. */
  private async getCardBase(tenantId: string, id: string): Promise<LoyaltyCard> {
    const card = await this.prisma.loyaltyCard.findFirst({ where: { id, tenantId } });
    if (!card) {
      throw new NotFoundException('Tarjeta de fidelización no encontrada');
    }
    return card;
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

  /** Maps an authenticated user to their client record within the salon. */
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

  /**
   * Validates that a referenced booking belongs to the salon, if provided.
   * Cross-domain read done directly via Prisma to avoid coupling modules.
   */
  // TODO(integration): mover a evento (bookings→loyalty) en la fase de integración.
  private async resolveBookingId(
    tenantId: string,
    bookingId: string | undefined,
  ): Promise<string | null> {
    if (!bookingId) {
      return null;
    }
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: { id: true },
    });
    if (!booking) {
      throw new BadRequestException('La reserva indicada no existe en este salón');
    }
    return booking.id;
  }
}
