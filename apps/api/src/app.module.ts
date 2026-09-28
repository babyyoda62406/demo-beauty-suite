import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { TransformInterceptor } from './common/transform.interceptor';
import { type AppConfig } from './config/configuration';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { TenantMiddleware } from './tenancy/tenant.middleware';

import { AiModule } from './modules/ai/ai.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ContentModule } from './modules/content/content.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsCashModule } from './modules/payments-cash/payments-cash.module';
import { PlansBillingModule } from './modules/plans-billing/plans-billing.module';
import { StatsModule } from './modules/stats/stats.module';
import { StoreModule } from './modules/store/store.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';

/**
 * Root module. Wires configuration, database, tenancy, rate-limiting, auth and
 * health, and registers the global guards/filter/interceptors (SPEC §4, §5).
 *
 * Guard order matters: throttling → authentication → RBAC. Domain modules are
 * registered by the integration phase at the marker below.
 */
@Module({
  imports: [
    ConfigModule,
    // Structured logging with pino; PII/secret fields are redacted (SPEC §5).
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const isProduction = config.get('isProduction', { infer: true });
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            autoLogging: false,
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'req.body.password',
              'req.body.token',
            ],
            ...(isProduction
              ? {}
              : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
          },
        };
      },
    }),
    PrismaModule,
    TenancyModule,
    // Global rate limit (SPEC §5); reinforced per-route in AuthController.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    HealthModule,

    // === DOMAIN_MODULES_WIRING (integration) ===
    // The integration phase inserts domain modules (tenants, clients, catalog,
    // bookings, loyalty, payments-cash, inventory, store, employees,
    // notifications, stats, content, superadmin, ai) here.
    TenantsModule,
    PlansBillingModule,
    UsersModule,
    ClientsModule,
    CatalogModule,
    BookingsModule,
    LoyaltyModule,
    PaymentsCashModule,
    InventoryModule,
    StoreModule,
    EmployeesModule,
    NotificationsModule,
    StatsModule,
    ContentModule,
    SuperadminModule,
    AiModule,
    UploadsModule,
    // === END DOMAIN_MODULES_WIRING ===
  ],
  providers: [
    TenantMiddleware,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Resolve tenant and open the AsyncLocalStorage scope for every request.
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
