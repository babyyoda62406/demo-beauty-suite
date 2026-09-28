import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';

/**
 * Platform Super Admin domain module (SPEC §7). `PrismaService` and
 * `ConfigService` are provided globally; auth/RBAC guards are registered
 * globally. `JwtModule` is registered without a static secret — the
 * impersonation token is signed per-call from validated config, mirroring
 * `AuthModule`. Wired into `AppModule` during the integration phase.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [SuperadminController],
  providers: [SuperadminService],
  exports: [SuperadminService],
})
export class SuperadminModule {}
