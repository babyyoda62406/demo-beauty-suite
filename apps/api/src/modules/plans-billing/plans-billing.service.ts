import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Plan,
  type PlanKey,
  type Subscription,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { type CreatePlanDto } from './dto/create-plan.dto';
import { type CreateSubscriptionDto } from './dto/create-subscription.dto';
import { type UpdatePlanDto } from './dto/update-plan.dto';

/** Subscription states that count as an active (non-terminal) subscription. */
const OPEN_SUBSCRIPTION_STATES: readonly SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.INCOMPLETE,
];

/**
 * Platform plans & billing (SPEC §6). Plans are global platform catalogue rows
 * managed by `SUPERADMIN`; `Subscription` is tenant-scoped and auto-isolated by
 * {@link PrismaService}. Stripe integration points are stubbed and marked
 * `TODO(external)` — the persistence model is complete so the wiring only needs
 * the Stripe SDK calls and webhook signature verification added later.
 */
@Injectable()
export class PlansBillingService {
  private readonly logger = new Logger(PlansBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Plans (platform catalogue, SUPERADMIN) --------------------------------

  /** Lists every plan ordered by monthly price (public pricing table). */
  listPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { priceMonthly: 'asc' } });
  }

  /** Returns a single plan by key or throws `NotFoundException`. */
  async getPlan(key: PlanKey): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({ where: { key } });
    if (!plan) {
      throw new NotFoundException(`No existe el plan ${key}`);
    }
    return plan;
  }

  /** Creates a new plan (SUPERADMIN). Fails if the key already exists. */
  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    const existing = await this.prisma.plan.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Ya existe un plan con la clave ${dto.key}`);
    }

    return this.prisma.plan.create({
      data: {
        key: dto.key,
        name: dto.name,
        priceMonthly: dto.priceMonthly,
        currency: dto.currency ?? 'EUR',
        features: (dto.features ?? {}) as Prisma.InputJsonValue,
        moduleFlags: (dto.moduleFlags ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /** Updates an existing plan (SUPERADMIN). */
  async updatePlan(key: PlanKey, dto: UpdatePlanDto): Promise<Plan> {
    await this.getPlan(key);

    const data: Prisma.PlanUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.priceMonthly !== undefined) data.priceMonthly = dto.priceMonthly;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.features !== undefined) data.features = dto.features as Prisma.InputJsonValue;
    if (dto.moduleFlags !== undefined) data.moduleFlags = dto.moduleFlags as Prisma.InputJsonValue;

    return this.prisma.plan.update({ where: { key }, data });
  }

  /** Deletes a plan (SUPERADMIN). Fails if tenants/subscriptions reference it. */
  async deletePlan(key: PlanKey): Promise<{ success: true }> {
    try {
      await this.prisma.plan.delete({ where: { key } });
      return { success: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`No existe el plan ${key}`);
        }
        if (error.code === 'P2003') {
          throw new ConflictException(
            'No se puede eliminar el plan: hay salones o suscripciones que lo usan',
          );
        }
      }
      throw error;
    }
  }

  // --- Subscriptions (tenant-scoped) -----------------------------------------

  /**
   * Subscribes the current tenant to a plan. Rejects a second open
   * subscription. Creates the local record in `TRIALING`; the Stripe
   * subscription (and resulting `stripeSubscriptionId` / `currentPeriodEnd`)
   * is provisioned asynchronously.
   */
  async subscribe(dto: CreateSubscriptionDto, tenantId: string | null): Promise<Subscription> {
    const resolvedTenantId = this.requireTenant(tenantId);

    // Ensure the target plan exists (Plan is not tenant-scoped).
    await this.getPlan(dto.planKey);

    const open = await this.prisma.subscription.findFirst({
      where: { tenantId: resolvedTenantId, status: { in: [...OPEN_SUBSCRIPTION_STATES] } },
    });
    if (open) {
      throw new ConflictException('El salón ya tiene una suscripción activa');
    }

    // TODO(external): crear la suscripción en Stripe (customer + subscription)
    // con idempotency-key y rellenar stripeSubscriptionId / currentPeriodEnd.
    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: resolvedTenantId,
        planKey: dto.planKey,
        status: SubscriptionStatus.TRIALING,
      },
    });

    // TODO(integration): mover a evento (SubscriptionCreated) para sincronizar
    // el planKey del Tenant en el dominio de tenants.
    await this.prisma.tenant.update({
      where: { id: resolvedTenantId },
      data: { planKey: dto.planKey },
    });

    this.logger.log(`Suscripción creada para el tenant ${resolvedTenantId} (plan ${dto.planKey})`);
    return subscription;
  }

  /** Returns the current tenant's latest subscription or throws if none. */
  async getMySubscription(tenantId: string | null): Promise<Subscription> {
    const resolvedTenantId = this.requireTenant(tenantId);
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId: resolvedTenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new NotFoundException('El salón no tiene ninguna suscripción');
    }
    return subscription;
  }

  /** Cancels the current tenant's open subscription. */
  async cancelMySubscription(tenantId: string | null): Promise<Subscription> {
    const resolvedTenantId = this.requireTenant(tenantId);
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId: resolvedTenantId, status: { in: [...OPEN_SUBSCRIPTION_STATES] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new NotFoundException('No hay ninguna suscripción activa que cancelar');
    }

    // TODO(external): cancelar la suscripción en Stripe (subscriptions.cancel).
    // `subscription.id` ya está resuelto dentro del tenant, por lo que el
    // update por id unívoco no cruza salones (SPEC §3).
    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  // --- Stripe webhook --------------------------------------------------------

  /**
   * Handles a Stripe webhook. The signature MUST be verified against the raw
   * request body before trusting the payload; that check is stubbed here.
   *
   * Runs outside any tenant request context, so subscription lookups target the
   * globally-unique `stripeSubscriptionId` rather than the tenant scope.
   */
  async handleStripeWebhook(
    payload: Record<string, unknown>,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    // TODO(external): verificar la firma con STRIPE_WEBHOOK_SECRET usando el
    // cuerpo RAW (stripe.webhooks.constructEvent(rawBody, signature, secret)).
    // Requiere que la fase de integración registre el raw-body parser para
    // POST /api/v1/billing/webhook en main.ts.
    if (!signature) {
      this.logger.warn('Webhook de Stripe recibido sin cabecera de firma');
    }

    const type = typeof payload.type === 'string' ? payload.type : 'unknown';
    this.logger.log(`Webhook de Stripe recibido: ${type}`);

    switch (type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed':
      case 'invoice.paid':
        // TODO(external): mapear el evento a un SubscriptionStatus y actualizar
        // la fila por stripeSubscriptionId (updateMany, sin scope de tenant).
        break;
      default:
        break;
    }

    return { received: true };
  }

  // --- helpers ---------------------------------------------------------------

  /** Ensures a tenant is resolved for tenant-scoped billing operations. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha resuelto ningún salón para la operación');
    }
    return tenantId;
  }
}
