import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { configuration } from './configuration';
import { validateEnv } from './env.validation';

/**
 * Global configuration module. Loads the structured `configuration()` tree and
 * validates the raw environment with zod at startup (SPEC §5, §10).
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
  ],
})
export class ConfigModule {}
