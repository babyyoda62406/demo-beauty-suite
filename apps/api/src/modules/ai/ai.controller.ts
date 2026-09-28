import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AiSuggestion } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { AiService, type SuggestionResult } from './ai.service';
import { AnalyzeHandDto } from './dto/analyze-hand.dto';
import { InspirationDto } from './dto/inspiration.dto';
import { QueryAiSuggestionsDto } from './dto/query-ai-suggestions.dto';
import { RecommendDesignsDto } from './dto/recommend-designs.dto';
import { SuggestColorsDto } from './dto/suggest-colors.dto';

/**
 * AI premium module (SPEC §7 `ai`). Staff (OWNER/MANAGER/EMPLOYEE) trigger
 * suggestions that are persisted as `AiSuggestion` rows and browse the history.
 * All routes are tenant-scoped; the module is gated to the Enterprise plan
 * (checked in the service, pending billing integration).
 */
@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('recommend-designs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sugerencias de diseños según temporada/preferencias.' })
  recommendDesigns(
    @TenantId() tenantId: string | null,
    @Body() dto: RecommendDesignsDto,
  ): Promise<SuggestionResult> {
    return this.ai.recommendDesigns(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('suggest-colors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sugiere una paleta de colores armónica.' })
  suggestColors(
    @TenantId() tenantId: string | null,
    @Body() dto: SuggestColorsDto,
  ): Promise<SuggestionResult> {
    return this.ai.suggestColors(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('analyze-hand')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Analiza una foto de la mano/uñas (recibe URL).' })
  analyzeHand(
    @TenantId() tenantId: string | null,
    @Body() dto: AnalyzeHandDto,
  ): Promise<SuggestionResult> {
    return this.ai.analyzeHand(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('inspiration')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Genera prompts/imágenes de inspiración (moodboard).' })
  inspiration(
    @TenantId() tenantId: string | null,
    @Body() dto: InspirationDto,
  ): Promise<SuggestionResult> {
    return this.ai.inspiration(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('suggestions')
  @ApiOperation({ summary: 'Historial paginado de sugerencias generadas.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryAiSuggestionsDto,
  ): Promise<PaginatedResult<AiSuggestion>> {
    return this.ai.list(this.requireTenant(tenantId), query);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
