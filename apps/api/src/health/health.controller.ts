import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/** Health probe response. */
interface HealthStatus {
  status: 'ok' | 'degraded';
  db: boolean;
  timestamp: string;
}

/** Liveness/readiness endpoint (public) with a database ping (SPEC §health). */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Comprobación de salud del servicio y de la base de datos.' })
  @ApiOkResponse({ description: 'Estado del servicio.' })
  async check(): Promise<HealthStatus> {
    const db = await this.prisma.ping();
    return {
      status: db ? 'ok' : 'degraded',
      db,
      timestamp: new Date().toISOString(),
    };
  }
}
