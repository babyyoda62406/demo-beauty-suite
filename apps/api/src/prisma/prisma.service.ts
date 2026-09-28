import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { tenantStorage } from '../tenancy/tenant-context';

/**
 * Models that carry a `tenantId` column and must be auto-scoped by tenant.
 * Child/join tables (e.g. `OrderItem`, `LessonProgress`) inherit isolation
 * through their parent and are intentionally excluded.
 */
const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set<string>([
  'Subscription',
  'ModuleActivation',
  'SupportTicket',
  'Client',
  'ServiceCategory',
  'Service',
  'Booking',
  'WaitlistEntry',
  'WorkingHours',
  'TimeOff',
  'LoyaltyCard',
  'Voucher',
  'GiftCard',
  'Promotion',
  'Coupon',
  'Referral',
  'Payment',
  'Invoice',
  'Expense',
  'CashSession',
  'Supplier',
  'Product',
  'StockMovement',
  'Order',
  'Employee',
  'Commission',
  'Course',
  'Enrollment',
  'Campaign',
  'Notification',
  'MessageTemplate',
  'BlogPost',
  'GalleryItem',
  'Testimonial',
  'Setting',
  'AiSuggestion',
]);

/**
 * Prisma client wired into Nest's lifecycle plus a tenant-scoping middleware.
 *
 * ## Tenant isolation approach (SPEC §3)
 * A Prisma query middleware reads the request's {@link tenantStorage} context
 * and forces `tenantId` into reads/writes for every tenant-scoped model:
 *  - reads (`findMany`, `findFirst`, `count`, `aggregate`, `groupBy`) get
 *    `where.tenantId` injected; `findUnique`(`OrThrow`) is rewritten to
 *    `findFirst`(`OrThrow`) so the extra predicate is allowed;
 *  - `create`/`createMany` get `data.tenantId` injected;
 *  - `updateMany`/`deleteMany` get `where.tenantId` injected.
 *
 * A `SUPERADMIN` context (platform support / impersonation) bypasses scoping,
 * as does any call made outside a request (seeds, cron, bootstrap). Single-row
 * `update`/`upsert`/`delete` use a unique `where` that cannot host an extra
 * predicate — services performing those MUST pass the id already resolved
 * within the tenant (or use the `*Many` variants) to avoid cross-tenant writes.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    });

    this.$use(async (params, next) => {
      const model = params.model;
      if (!model || !TENANT_SCOPED_MODELS.has(model)) {
        return next(params);
      }

      const store = tenantStorage.getStore();
      // No context, superadmin, or no resolved tenant → do not scope.
      if (!store || store.role === 'SUPERADMIN' || !store.tenantId) {
        return next(params);
      }

      const tenantId = store.tenantId;
      const args = (params.args ?? {}) as Record<string, unknown>;

      switch (params.action) {
        case 'findUnique':
        case 'findUniqueOrThrow': {
          params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
          args.where = { ...(args.where as object), tenantId };
          break;
        }
        case 'findFirst':
        case 'findFirstOrThrow':
        case 'findMany':
        case 'count':
        case 'aggregate':
        case 'groupBy':
        case 'updateMany':
        case 'deleteMany': {
          args.where = { ...(args.where as object), tenantId };
          break;
        }
        case 'create': {
          args.data = { ...(args.data as object), tenantId };
          break;
        }
        case 'createMany': {
          const data = args.data;
          if (Array.isArray(data)) {
            args.data = data.map((row) => ({ ...(row as object), tenantId }));
          } else {
            args.data = { ...(data as object), tenantId };
          }
          break;
        }
        default:
          // update / upsert / delete: enforced at the service layer (see docblock).
          break;
      }

      params.args = args;
      return next(params);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma conectado a la base de datos');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Lightweight connectivity probe used by the health endpoint (SPEC §health). */
  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw(Prisma.sql`SELECT 1`);
      return true;
    } catch (error) {
      this.logger.error('Fallo en el ping a la base de datos', (error as Error).stack);
      return false;
    }
  }
}
