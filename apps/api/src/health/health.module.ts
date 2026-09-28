import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/** Exposes the public health endpoint. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
