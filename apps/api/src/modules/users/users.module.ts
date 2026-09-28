import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Users module — staff account management per tenant (SPEC §7). Consumes the
 * global `PrismaService`; RBAC/JWT guards are registered globally by the core.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
