import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AppConfig } from '../../config/configuration';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { resolveUploadDir } from './uploads.util';

/**
 * Módulo de subidas de imágenes (CMS de la clienta, SPEC §9). Al arrancar
 * resuelve/crea el directorio configurado (`UPLOAD_DIR`) para que exista antes
 * de la primera petición.
 */
@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule implements OnModuleInit {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    resolveUploadDir(this.config.get('uploads', { infer: true }).dir);
  }
}
