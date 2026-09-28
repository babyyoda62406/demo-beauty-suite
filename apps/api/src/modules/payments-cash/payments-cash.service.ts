import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type CashSession,
  type Expense,
  type Invoice,
  type Payment,
  Prisma,
} from '@prisma/client';

import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CloseCashSessionDto } from './dto/close-cash-session.dto';
import { type CreateExpenseDto } from './dto/create-expense.dto';
import { type CreateInvoiceDto, type InvoiceItemDto } from './dto/create-invoice.dto';
import { type CreatePaymentDto } from './dto/create-payment.dto';
import { type OpenCashSessionDto } from './dto/open-cash-session.dto';
import { type QueryExpensesDto } from './dto/query-expenses.dto';
import { type QueryInvoicesDto } from './dto/query-invoices.dto';
import { type QueryPaymentsDto } from './dto/query-payments.dto';
import { type UpdateExpenseDto } from './dto/update-expense.dto';
import { type UpdateInvoiceDto } from './dto/update-invoice.dto';
import { type UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

/** Prefix + zero-padding width for per-tenant sequential invoice numbers. */
const INVOICE_PREFIX = 'INV-';
const INVOICE_PAD = 6;

/** Whitelisted, safe columns for payment ordering (avoids injection via sortBy). */
const PAYMENT_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'amount',
  'method',
  'status',
  'createdAt',
  'updatedAt',
]);

/** Whitelisted, safe columns for expense ordering. */
const EXPENSE_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'amount',
  'category',
  'date',
  'createdAt',
]);

/** Ticket tal y como se muestra en su página pública. */
export interface PublicTicket {
  number: string;
  issuedAt: Date;
  items: unknown;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  clientName: string | null;
  salonName: string;
  brand: unknown;
}

/** Aggregated income/expense figures for a single UTC day. */
export interface CashRegisterSummary {
  date: string;
  currency: string;
  income: {
    total: number;
    count: number;
    byMethod: Record<string, number>;
  };
  expenses: {
    total: number;
    count: number;
  };
  net: number;
}

/**
 * Cash & payments domain service (SPEC §6/§7 `payments-cash`): payments,
 * invoices with per-tenant sequential numbering, expenses and cash sessions —
 * all strictly tenant-scoped. Every query is additionally filtered by the
 * resolved `tenantId` on top of the Prisma tenant middleware as defence in
 * depth, and single-row updates/deletes verify ownership first (the middleware
 * cannot scope unique-`where` writes — see `PrismaService`). Money is integer
 * cents; timestamps are UTC.
 */
@Injectable()
export class PaymentsCashService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  /** Registers a payment associated with a booking/order/client. */
  async createPayment(tenantId: string, dto: CreatePaymentDto): Promise<Payment> {
    if (dto.clientId) await this.assertClientExists(tenantId, dto.clientId);
    if (dto.bookingId) await this.assertBookingExists(tenantId, dto.bookingId);
    if (dto.orderId) await this.assertOrderExists(tenantId, dto.orderId);

    return this.prisma.payment.create({
      data: {
        tenantId,
        clientId: dto.clientId ?? null,
        bookingId: dto.bookingId ?? null,
        orderId: dto.orderId ?? null,
        amount: dto.amount,
        currency: dto.currency ?? 'EUR',
        method: dto.method,
        status: dto.status ?? 'PENDING',
      },
    });
  }

  /** Admin paginated listing of payments with optional filters. */
  /**
   * Ficha de la clienta autenticada, o `null` si aún no tiene.
   *
   * El portal no debe romperse por no tener ficha: en ese caso lista vacía.
   */
  private async resolveMyClientId(tenantId: string, userId: string): Promise<string | null> {
    const client = await this.prisma.client.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    return client?.id ?? null;
  }

  /**
   * Pagos de la clienta autenticada.
   *
   * El `clientId` se resuelve SIEMPRE desde su sesión y se ignora el que
   * pudiera llegar en la petición: si no, bastaría con cambiar un parámetro
   * para leer los pagos de otra clienta.
   */
  async listMyPayments(
    tenantId: string,
    userId: string,
    query: QueryPaymentsDto,
  ): Promise<PaginatedResult<Payment>> {
    const clientId = await this.resolveMyClientId(tenantId, userId);
    if (!clientId) return buildPaginatedResult([], 0, query);
    // Se sobrescribe sobre el propio DTO (no una copia) para conservar sus
    // getters de paginación, y de paso pisar cualquier clientId recibido.
    query.clientId = clientId;
    return this.listPayments(tenantId, query);
  }

  /** Facturas de la clienta autenticada (mismo criterio que los pagos). */
  async listMyInvoices(
    tenantId: string,
    userId: string,
    query: QueryInvoicesDto,
  ): Promise<PaginatedResult<Invoice>> {
    const clientId = await this.resolveMyClientId(tenantId, userId);
    if (!clientId) return buildPaginatedResult([], 0, query);
    query.clientId = clientId;
    return this.listInvoices(tenantId, query);
  }

  async listPayments(tenantId: string, query: QueryPaymentsDto): Promise<PaginatedResult<Payment>> {
    const where: Prisma.PaymentWhereInput = { tenantId };
    if (query.method !== undefined) where.method = query.method;
    if (query.status !== undefined) where.status = query.status;
    if (query.clientId !== undefined) where.clientId = query.clientId;
    if (query.bookingId !== undefined) where.bookingId = query.bookingId;

    const orderBy = this.resolveOrder(PAYMENT_SORT_FIELDS, query.sortBy, query.sortOrder, 'createdAt');

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.payment.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getPayment(tenantId: string, id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  /** Transitions a payment to a new status (e.g. PAID, FAILED, REFUNDED). */
  async updatePaymentStatus(
    tenantId: string,
    id: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    await this.getPayment(tenantId, id);
    return this.prisma.payment.update({ where: { id }, data: { status: dto.status } });
  }

  /**
   * Creates a Stripe PaymentIntent for card-not-present flows.
   * // TODO(external): integrar Stripe SDK (idempotency-key, confirmación por webhook firmado; SPEC §5).
   */
  createStripeIntent(_tenantId: string, _dto: CreatePaymentDto): Promise<never> {
    throw new BadRequestException('La integración con Stripe aún no está disponible');
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  /**
   * Creates an invoice with server-computed totals and a per-tenant sequential
   * `number`. Numbering runs inside a transaction and is backed by the
   * `@@unique([tenantId, number])` constraint to prevent duplicates (SPEC §6).
   */
  async createInvoice(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    if (dto.clientId) await this.assertClientExists(tenantId, dto.clientId);

    const subtotal = this.computeSubtotal(dto.items);
    const tax = Math.round((subtotal * (dto.taxRate ?? 0)) / 100);
    const total = subtotal + tax;
    const items = dto.items as unknown as Prisma.InputJsonValue;

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.invoice.count({ where: { tenantId } });
      const number = this.formatInvoiceNumber(count + 1);
      return tx.invoice.create({
        data: {
          tenantId,
          clientId: dto.clientId ?? null,
          number,
          items,
          subtotal,
          tax,
          total,
          currency: dto.currency ?? 'EUR',
          status: 'DRAFT',
        },
      });
    });
  }

  async listInvoices(tenantId: string, query: QueryInvoicesDto): Promise<PaginatedResult<Invoice>> {
    const where: Prisma.InvoiceWhereInput = { tenantId };
    if (query.status !== undefined) where.status = query.status;
    if (query.clientId !== undefined) where.clientId = query.clientId;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getInvoice(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId } });
    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }
    return invoice;
  }

  /** Updates status/PDF; transitioning to ISSUED stamps `issuedAt` if unset. */
  async updateInvoice(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.getInvoice(tenantId, id);

    const data: Prisma.InvoiceUpdateInput = {};
    if (dto.pdfUrl !== undefined) data.pdfUrl = dto.pdfUrl;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'ISSUED' && !invoice.issuedAt) {
        data.issuedAt = new Date();
      }
    }

    return this.prisma.invoice.update({ where: { id }, data });
  }

  /** Convenience transition DRAFT → ISSUED, stamping `issuedAt`. */
  async issueInvoice(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.getInvoice(tenantId, id);
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Solo se puede emitir una factura en borrador');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'ISSUED',
        issuedAt: invoice.issuedAt ?? new Date(),
        // El ticket se comparte por WhatsApp: hace falta un enlace que la
        // clienta pueda abrir sin cuenta. Se genera al emitir y sólo entonces.
        publicToken: invoice.publicToken ?? randomBytes(24).toString('base64url'),
      },
    });
  }

  /**
   * Garantiza que la factura tiene enlace público y lo devuelve.
   *
   * Las emitidas antes de que existieran los tickets no tienen token; en vez de
   * obligar a reemitirlas, se les crea al pedir el enlace por primera vez.
   */
  async ensurePublicToken(tenantId: string, id: string): Promise<string> {
    const invoice = await this.getInvoice(tenantId, id);
    if (invoice.publicToken) return invoice.publicToken;
    const publicToken = randomBytes(24).toString('base64url');
    await this.prisma.invoice.update({ where: { id }, data: { publicToken } });
    return publicToken;
  }

  /**
   * Ticket para la página pública, localizado por su token.
   *
   * Devuelve sólo lo que se imprime en un recibo (salón, líneas, importes y
   * nombre de pila de la clienta): el enlace viaja por WhatsApp y no debe
   * exponer teléfono, correo ni historial. No se filtra por tenant porque el
   * token es único en toda la plataforma y es la propia credencial.
   */
  async findPublicTicket(token: string): Promise<PublicTicket> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { publicToken: token, status: { not: 'DRAFT' } },
      include: {
        client: { select: { name: true } },
        tenant: { select: { name: true, brand: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException('Ticket no encontrado');
    }
    return {
      number: invoice.number,
      issuedAt: invoice.issuedAt ?? invoice.createdAt,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      clientName: invoice.client?.name?.split(' ')[0] ?? null,
      salonName: invoice.tenant?.name ?? 'Salón',
      brand: invoice.tenant?.brand ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // Expenses
  // ---------------------------------------------------------------------------

  async createExpense(tenantId: string, dto: CreateExpenseDto): Promise<Expense> {
    if (dto.supplierId) await this.assertSupplierExists(tenantId, dto.supplierId);
    return this.prisma.expense.create({
      data: {
        tenantId,
        category: dto.category.trim(),
        amount: dto.amount,
        currency: dto.currency ?? 'EUR',
        description: dto.description ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
        supplierId: dto.supplierId ?? null,
      },
    });
  }

  async listExpenses(tenantId: string, query: QueryExpensesDto): Promise<PaginatedResult<Expense>> {
    const where: Prisma.ExpenseWhereInput = { tenantId };
    if (query.category !== undefined) where.category = query.category;
    const dateFilter = this.buildDateRange(query.from, query.to);
    if (dateFilter) where.date = dateFilter;

    const orderBy = this.resolveOrder(EXPENSE_SORT_FIELDS, query.sortBy, query.sortOrder, 'date');

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.expense.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getExpense(tenantId: string, id: string): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId } });
    if (!expense) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return expense;
  }

  async updateExpense(tenantId: string, id: string, dto: UpdateExpenseDto): Promise<Expense> {
    await this.getExpense(tenantId, id);
    if (dto.supplierId) await this.assertSupplierExists(tenantId, dto.supplierId);

    const data: Prisma.ExpenseUpdateInput = {};
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.supplierId !== undefined) {
      data.supplier = dto.supplierId
        ? { connect: { id: dto.supplierId } }
        : { disconnect: true };
    }

    return this.prisma.expense.update({ where: { id }, data });
  }

  async deleteExpense(tenantId: string, id: string): Promise<void> {
    await this.getExpense(tenantId, id);
    await this.prisma.expense.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Cash sessions
  // ---------------------------------------------------------------------------

  /** Opens a cash session. Fails if the tenant already has one open. */
  async openCashSession(
    tenantId: string,
    openedById: string,
    dto: OpenCashSessionDto,
  ): Promise<CashSession> {
    const existing = await this.prisma.cashSession.findFirst({
      where: { tenantId, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya hay una sesión de caja abierta');
    }

    return this.prisma.cashSession.create({
      data: {
        tenantId,
        openedById,
        openingFloat: dto.openingFloat,
        currency: dto.currency ?? 'EUR',
        status: 'OPEN',
      },
    });
  }

  /**
   * Closes the open cash session: the expected amount is the opening float plus
   * every CASH payment marked PAID since the session opened; the difference is
   * the counted `closingAmount` minus that expectation (SPEC §6).
   */
  async closeCashSession(tenantId: string, dto: CloseCashSessionDto): Promise<CashSession> {
    const session = await this.prisma.cashSession.findFirst({
      where: { tenantId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) {
      throw new NotFoundException('No hay ninguna sesión de caja abierta');
    }

    const cashTakings = await this.sumCashTakings(tenantId, session.openedAt);
    const expectedAmount = session.openingFloat + cashTakings;
    const difference = dto.closingAmount - expectedAmount;

    return this.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        closingAmount: dto.closingAmount,
        expectedAmount,
        difference,
        closedAt: new Date(),
        status: 'CLOSED',
      },
    });
  }

  /** Returns the currently open cash session, or `null` if none is open. */
  async currentCashSession(tenantId: string): Promise<CashSession | null> {
    return this.prisma.cashSession.findFirst({
      where: { tenantId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async listCashSessions(tenantId: string): Promise<CashSession[]> {
    return this.prisma.cashSession.findMany({
      where: { tenantId },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
  }

  // ---------------------------------------------------------------------------
  // Cash register summary
  // ---------------------------------------------------------------------------

  /** Aggregates PAID income (by method) and expenses for a single UTC day. */
  async cashRegisterSummary(tenantId: string, date?: string): Promise<CashRegisterSummary> {
    const { start, end } = this.utcDayBounds(date);

    const [grouped, incomeTotal, expenseAgg] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { tenantId, status: 'PAID', createdAt: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: { tenantId, status: 'PAID', createdAt: { gte: start, lt: end } },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: { tenantId, date: { gte: start, lt: end } },
      }),
    ]);

    const byMethod: Record<string, number> = {};
    for (const row of grouped) {
      byMethod[row.method] = row._sum.amount ?? 0;
    }

    const income = incomeTotal._sum.amount ?? 0;
    const expenses = expenseAgg._sum.amount ?? 0;

    return {
      date: start.toISOString(),
      currency: 'EUR',
      income: { total: income, count: incomeTotal._count._all, byMethod },
      expenses: { total: expenses, count: expenseAgg._count._all },
      net: income - expenses,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async sumCashTakings(tenantId: string, since: Date): Promise<number> {
    const agg = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { tenantId, method: 'CASH', status: 'PAID', createdAt: { gte: since } },
    });
    return agg._sum.amount ?? 0;
  }

  private computeSubtotal(items: InvoiceItemDto[]): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  private formatInvoiceNumber(sequence: number): string {
    return `${INVOICE_PREFIX}${String(sequence).padStart(INVOICE_PAD, '0')}`;
  }

  private buildDateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const filter: Prisma.DateTimeFilter = {};
    if (from) filter.gte = new Date(from);
    if (to) filter.lte = new Date(to);
    return filter;
  }

  /** Start (inclusive) and end (exclusive) of the UTC day containing `date`. */
  private utcDayBounds(date?: string): { start: Date; end: Date } {
    const base = date ? new Date(date) : new Date();
    if (Number.isNaN(base.getTime())) {
      throw new BadRequestException('Fecha no válida');
    }
    const start = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
    );
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private resolveOrder(
    allowed: ReadonlySet<string>,
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
    fallback: string,
  ): Record<string, 'asc' | 'desc'> {
    const field = sortBy && allowed.has(sortBy) ? sortBy : fallback;
    return { [field]: sortOrder };
  }

  private async assertClientExists(tenantId: string, clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
    if (!client) {
      throw new BadRequestException('El cliente indicado no existe en este salón');
    }
  }

  private async assertBookingExists(tenantId: string, bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: { id: true },
    });
    if (!booking) {
      throw new BadRequestException('La reserva indicada no existe en este salón');
    }
  }

  private async assertOrderExists(tenantId: string, orderId: string): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) {
      throw new BadRequestException('El pedido indicado no existe en este salón');
    }
  }

  private async assertSupplierExists(tenantId: string, supplierId: string): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException('El proveedor indicado no existe en este salón');
    }
  }
}
