import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Order,
  type OrderStatus,
  Prisma,
  type Product,
} from '@prisma/client';

import { type AuthenticatedUser } from '../../auth/auth.types';
import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { getCurrentTenantId } from '../../tenancy/tenant-context';

import { type CreateOrderDto } from './dto/create-order.dto';
import { type QueryOrdersDto } from './dto/query-orders.dto';
import { type QueryStoreProductsDto } from './dto/query-store-products.dto';

/** Allowed order state transitions (SPEC §7 — tienda online). */
const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/** Statuses for which the reserved stock has NOT been returned to inventory. */
const STOCK_RESERVED_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
]);

/** Rich order projection returned by the detail/listing endpoints. */
const ORDER_INCLUDE = {
  items: {
    include: { product: { select: { id: true, name: true, sku: true, imageUrl: true } } },
  },
  client: { select: { id: true, name: true, phone: true, email: true } },
} satisfies Prisma.OrderInclude;

/**
 * Online store domain service (SPEC §6, §7).
 *
 * Serves the public product catalog and the authenticated checkout: stock is
 * validated and priced from the live `Product`, an `Order` + `OrderItem`s are
 * created transactionally, stock is decremented via `StockMovement` (kind
 * `OUT`) and a `PENDING` `Payment` is opened (Stripe capture happens later). A
 * `CLIENT` only ever sees/creates their own orders; staff manage every order
 * and drive the state machine, restocking on cancellation.
 *
 * All queries are tenant-scoped by the Prisma middleware; single-row `update`s
 * always resolve the row within the tenant first (see PrismaService docblock).
 */
@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Public catalog
  // ---------------------------------------------------------------------------

  /** Lists active storefront products (`isStoreItem`) for the resolved tenant. */
  async listProducts(query: QueryStoreProductsDto): Promise<PaginatedResult<Product>> {
    const where: Prisma.ProductWhereInput = { active: true, isStoreItem: true };
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder }
      : { name: query.sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  // ---------------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------------

  /**
   * Checkout: validates stock and prices lines from the live catalog, then
   * atomically creates the order + items, decrements stock via `StockMovement`
   * and opens a `PENDING` Stripe payment. Duplicate lines for the same product
   * are merged before validation.
   */
  async checkout(dto: CreateOrderDto, user: AuthenticatedUser): Promise<Order> {
    const clientId = await this.resolveOrderClientId(dto, user);
    const quantities = this.mergeQuantities(dto.items);
    const productIds = [...quantities.keys()];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true, isStoreItem: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o más productos no están disponibles en la tienda');
    }

    const lines = products.map((product) => {
      const quantity = quantities.get(product.id) ?? 0;
      if (product.stock < quantity) {
        throw new ConflictException(`Stock insuficiente para "${product.name}"`);
      }
      return { product, quantity, unitPrice: product.price };
    });

    const tenantId = this.requireTenantId();
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const shipping = dto.shipping ?? 0;
    const total = subtotal + shipping;
    const currency = products[0]?.currency ?? 'EUR';

    const orderData: Prisma.OrderUncheckedCreateInput = {
      tenantId,
      clientId,
      subtotal,
      shipping,
      total,
      currency,
      status: 'PENDING',
      items: {
        create: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      },
    };
    if (dto.shippingAddress !== undefined) {
      orderData.shippingAddress = dto.shippingAddress as Prisma.InputJsonValue;
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({ data: orderData });

      for (const line of lines) {
        // Single-row update: id already resolved within the tenant above.
        await tx.product.update({
          where: { id: line.product.id },
          data: { stock: { decrement: line.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: line.product.id,
            kind: 'OUT',
            quantity: line.quantity,
            reason: `Venta tienda online (pedido ${order.id})`,
          },
        });
      }

      // TODO(external Stripe): crear PaymentIntent y capturar en el webhook.
      const payment = await tx.payment.create({
        data: {
          tenantId,
          clientId,
          orderId: order.id,
          amount: total,
          currency,
          method: 'STRIPE',
          status: 'PENDING',
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: { paymentId: payment.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Listing / detail
  // ---------------------------------------------------------------------------

  /** Lists orders: a `CLIENT` sees only their own, staff/admin see all. */
  async listOrders(query: QueryOrdersDto, user: AuthenticatedUser): Promise<PaginatedResult<Order>> {
    const where: Prisma.OrderWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (user.role === 'CLIENT') {
      const clientId = await this.findClientId(user.userId);
      if (!clientId) {
        return buildPaginatedResult<Order>([], 0, query);
      }
      where.clientId = clientId;
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  /** Single order with its lines; a `CLIENT` may only read their own. */
  async findOne(id: string, user: AuthenticatedUser): Promise<Order> {
    const order = await this.prisma.order.findFirst({ where: { id }, include: ORDER_INCLUDE });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (user.role === 'CLIENT') {
      const clientId = await this.findClientId(user.userId);
      if (!clientId || order.clientId !== clientId) {
        throw new ForbiddenException('No tienes acceso a este pedido');
      }
    }
    return order;
  }

  // ---------------------------------------------------------------------------
  // State machine (staff)
  // ---------------------------------------------------------------------------

  /**
   * Transitions an order to a new status. Restocks every line (StockMovement
   * `IN`) when moving to `CANCELLED`/`REFUNDED` from a stock-reserved state, and
   * syncs the linked payment (PAID → paid, cancelled/refunded → matching state).
   */
  async updateStatus(id: string, target: OrderStatus): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (order.status === target) {
      throw new ConflictException(`El pedido ya está en estado ${target}`);
    }
    if (!ORDER_TRANSITIONS[order.status].includes(target)) {
      throw new ConflictException(
        `Transición no permitida: ${order.status} → ${target}`,
      );
    }

    const restock = STOCK_RESERVED_STATUSES.has(order.status)
      && (target === 'CANCELLED' || target === 'REFUNDED');
    const tenantId = this.requireTenantId();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: target },
        include: ORDER_INCLUDE,
      });

      if (restock) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              kind: 'IN',
              quantity: item.quantity,
              reason: `Reposición por pedido ${order.id} (${target})`,
            },
          });
        }
      }

      const paymentStatus = this.paymentStatusFor(target);
      if (paymentStatus) {
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: paymentStatus },
        });
      }

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Resolves the client the order belongs to based on the caller's role. */
  private async resolveOrderClientId(
    dto: CreateOrderDto,
    user: AuthenticatedUser,
  ): Promise<string | null> {
    if (user.role === 'CLIENT') {
      const clientId = await this.findClientId(user.userId);
      if (!clientId) {
        throw new ForbiddenException('No hay una ficha de clienta asociada a tu cuenta');
      }
      return clientId;
    }
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId },
        select: { id: true },
      });
      if (!client) {
        throw new BadRequestException('La clienta indicada no existe en este salón');
      }
      return client.id;
    }
    return null;
  }

  /** Resolves the current tenant id, failing loudly if the request has none. */
  private requireTenantId(): string {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }

  /** Maps an authenticated user to their client id within the salon, if any. */
  private async findClientId(userId: string): Promise<string | null> {
    const client = await this.prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });
    return client?.id ?? null;
  }

  /** Collapses repeated product lines into a single quantity per product. */
  private mergeQuantities(items: CreateOrderDto['items']): Map<string, number> {
    const quantities = new Map<string, number>();
    for (const item of items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    return quantities;
  }

  /** Payment status implied by an order transition, or `null` to leave it. */
  private paymentStatusFor(target: OrderStatus): 'PAID' | 'CANCELLED' | 'REFUNDED' | null {
    switch (target) {
      case 'PAID':
        return 'PAID';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'REFUNDED':
        return 'REFUNDED';
      default:
        return null;
    }
  }
}
