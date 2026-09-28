import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { type AiSuggestion, AiSuggestionType, Prisma } from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type AnalyzeHandDto } from './dto/analyze-hand.dto';
import { type InspirationDto } from './dto/inspiration.dto';
import { type QueryAiSuggestionsDto } from './dto/query-ai-suggestions.dto';
import { type AiSeason, type RecommendDesignsDto } from './dto/recommend-designs.dto';
import { type SuggestColorsDto } from './dto/suggest-colors.dto';

/** Seasonal colour palettes (hex) used by the deterministic heuristic. */
const SEASON_PALETTES: Record<AiSeason, readonly string[]> = {
  SPRING: ['#F7C6D9', '#C1E1C1', '#FFF3B0', '#B5EAD7', '#FFB7B2', '#E2C2FF'],
  SUMMER: ['#00B4D8', '#FF6B6B', '#FFD166', '#06D6A0', '#F72585', '#4CC9F0'],
  AUTUMN: ['#C1440E', '#8D6A9F', '#D4A373', '#6B705C', '#BC6C25', '#7F5539'],
  WINTER: ['#1D3557', '#457B9D', '#A8DADC', '#E63946', '#F1FAEE', '#6D6875'],
};

/** Nail design archetypes the heuristic draws from. */
const DESIGN_LIBRARY: readonly string[] = [
  'Francesa moderna con línea metalizada',
  'Ojo de gato multidimensional',
  'Minimalista nude con detalle dorado',
  'Efecto mármol en tonos pastel',
  'Degradado (baby boomer) suave',
  'Arte floral pintado a mano',
  'Glitter parcial en punta',
  'Encapsulado con flores secas',
  'Líneas geométricas negras',
  'Aurora / cromo holográfico',
  'Animal print sutil',
  'Acabado terciopelo (velvet)',
];

/** Result envelope shared by every suggestion endpoint. */
export type SuggestionResult = AiSuggestion;

/**
 * AI domain service (SPEC §7 `ai`, módulo premium). Persists every request as an
 * {@link AiSuggestion} (`input`/`output` JSON) and returns a deterministic
 * heuristic response as a stand-in for the real provider. All operations are
 * tenant-scoped (SPEC §3): the Prisma middleware injects `tenantId` on writes,
 * and referenced clients are verified to belong to the salon.
 *
 * Gating: this whole module is premium and must be reserved to the Enterprise
 * plan; the check is stubbed here pending the billing integration.
 */
@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Endpoints -------------------------------------------------------------

  /** Seasonal/preference-based nail design recommendations. */
  async recommendDesigns(tenantId: string, dto: RecommendDesignsDto): Promise<SuggestionResult> {
    await this.assertEnterprisePlan(tenantId);
    const clientId = await this.resolveClientId(tenantId, dto.clientId);

    const season = dto.season ?? this.currentSeason();
    const limit = dto.limit ?? 5;
    const seed = this.hash(`designs|${season}|${(dto.preferences ?? []).join(',')}|${clientId ?? ''}`);
    const designs = this.pick(DESIGN_LIBRARY, limit, seed).map((name, idx) => ({
      title: name,
      season,
      matchedPreferences: this.matchPreferences(name, dto.preferences),
      confidence: this.confidence(seed, idx),
    }));

    // TODO(external: Claude API / generación de imágenes) — sustituir la heurística
    // determinista por una llamada al proveedor real de recomendaciones.
    const output = { season, designs };
    return this.persist(tenantId, clientId, AiSuggestionType.DESIGN, dto, output);
  }

  /** Deterministic colour palette suggestion. */
  async suggestColors(tenantId: string, dto: SuggestColorsDto): Promise<SuggestionResult> {
    await this.assertEnterprisePlan(tenantId);
    const clientId = await this.resolveClientId(tenantId, dto.clientId);

    const season = dto.season ?? this.currentSeason();
    const count = dto.count ?? 5;
    const seed = this.hash(`colors|${season}|${dto.baseColor ?? ''}|${dto.skinTone ?? ''}|${clientId ?? ''}`);

    // The base colour, when provided, is always the primary; the rest of the
    // palette is drawn deterministically from the seasonal set.
    const seasonal = this.pick([...SEASON_PALETTES[season]], count, seed);
    const palette = dto.baseColor
      ? [dto.baseColor.toUpperCase(), ...seasonal].slice(0, count)
      : seasonal;

    // TODO(external: Claude API / generación de imágenes) — armonización real de color.
    const output = {
      season,
      skinTone: dto.skinTone ?? null,
      palette: palette.map((hex, idx) => ({ hex, role: idx === 0 ? 'primary' : 'accent' })),
    };
    return this.persist(tenantId, clientId, AiSuggestionType.COLOR, dto, output);
  }

  /** Heuristic hand/nail photo analysis (placeholder for vision provider). */
  async analyzeHand(tenantId: string, dto: AnalyzeHandDto): Promise<SuggestionResult> {
    await this.assertEnterprisePlan(tenantId);
    const clientId = await this.resolveClientId(tenantId, dto.clientId);

    const seed = this.hash(`hand|${dto.photoUrl}`);
    const shapes = ['almendra', 'cuadrada', 'redonda', 'ovalada', 'stiletto', 'coffin'];
    const lengths = ['corta', 'media', 'larga'];
    const conditions = ['saludable', 'deshidratada', 'quebradiza'];

    // TODO(external: Claude API / generación de imágenes) — análisis de imagen real
    // a partir de dto.photoUrl (visión). Aquí devolvemos observaciones deterministas.
    const output = {
      photoUrl: dto.photoUrl,
      observations: {
        recommendedShape: shapes[seed % shapes.length],
        nailLength: lengths[seed % lengths.length],
        condition: conditions[seed % conditions.length],
      },
      confidence: this.confidence(seed, 0),
    };
    return this.persist(tenantId, clientId, AiSuggestionType.OTHER, dto, output);
  }

  /** Generates deterministic moodboard prompts (and placeholder image URLs). */
  async inspiration(tenantId: string, dto: InspirationDto): Promise<SuggestionResult> {
    await this.assertEnterprisePlan(tenantId);
    const clientId = await this.resolveClientId(tenantId, dto.clientId);

    const theme = dto.theme?.trim() || 'tendencias actuales';
    const count = dto.count ?? 4;
    const keywords = dto.keywords ?? [];
    const seed = this.hash(`inspo|${theme}|${keywords.join(',')}|${clientId ?? ''}`);
    const styles = this.pick(DESIGN_LIBRARY, count, seed);

    // TODO(external: Claude API / generación de imágenes) — generar imágenes reales
    // a partir de estos prompts con el proveedor de generación.
    const items = styles.map((style, idx) => {
      const prompt = `Uñas ${style.toLowerCase()}, temática "${theme}"${keywords.length ? `, ${keywords.join(', ')}` : ''}, fotografía macro, iluminación de estudio`;
      return {
        prompt,
        // Placeholder determinista; el proveedor real reemplazará esta URL.
        imageUrl: `https://placeholder.local/ai/${seed.toString(16)}-${idx}.png`,
      };
    });

    const output = { theme, keywords, items };
    return this.persist(tenantId, clientId, AiSuggestionType.DESIGN, dto, output);
  }

  // --- History ---------------------------------------------------------------

  /** Paginated history of persisted suggestions for the salon. */
  async list(tenantId: string, query: QueryAiSuggestionsDto): Promise<PaginatedResult<AiSuggestion>> {
    const where: Prisma.AiSuggestionWhereInput = { tenantId };
    if (query.type !== undefined) where.type = query.type;
    if (query.clientId !== undefined) where.clientId = query.clientId;

    const [data, total] = await Promise.all([
      this.prisma.aiSuggestion.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.aiSuggestion.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  // --- helpers ---------------------------------------------------------------

  /**
   * Ensures the salon is on the Enterprise plan before serving premium AI.
   * Stubbed until billing is wired.
   */
  // TODO(integration): comprobar el plan Enterprise (subscription/moduleFlags) y
  // lanzar ForbiddenException cuando el salón no tenga acceso al módulo IA.
  private async assertEnterprisePlan(tenantId: string): Promise<void> {
    void tenantId;
    void ForbiddenException;
    return;
  }

  /** Persists an AiSuggestion row and returns it. */
  private persist(
    tenantId: string,
    clientId: string | null,
    type: AiSuggestionType,
    input: unknown,
    output: unknown,
  ): Promise<AiSuggestion> {
    return this.prisma.aiSuggestion.create({
      data: {
        tenantId,
        clientId,
        type,
        input: this.toJson(input),
        output: this.toJson(output),
      },
    });
  }

  /** Validates a referenced client belongs to the salon; returns null if none. */
  private async resolveClientId(
    tenantId: string,
    clientId: string | undefined,
  ): Promise<string | null> {
    if (!clientId) {
      return null;
    }
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
    if (!client) {
      throw new BadRequestException('La clienta indicada no existe en este salón');
    }
    return client.id;
  }

  /** Serializes an arbitrary payload into a Prisma-safe JSON value. */
  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  /** Deterministic non-negative 32-bit hash (FNV-1a). */
  private hash(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /** Deterministically picks `n` items from a list without repetition. */
  private pick<T>(items: readonly T[], n: number, seed: number): T[] {
    if (items.length === 0) {
      return [];
    }
    const pool = [...items];
    const out: T[] = [];
    let s = seed;
    const take = Math.min(n, pool.length);
    for (let i = 0; i < take; i += 1) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const idx = s % pool.length;
      const [chosen] = pool.splice(idx, 1);
      if (chosen !== undefined) {
        out.push(chosen);
      }
    }
    return out;
  }

  /** Maps a design name to the client preferences it matches (case-insensitive). */
  private matchPreferences(name: string, preferences: string[] | undefined): string[] {
    if (!preferences?.length) {
      return [];
    }
    const lower = name.toLowerCase();
    return preferences.filter((p) => lower.includes(p.toLowerCase()));
  }

  /** Deterministic pseudo-confidence in [0.6, 0.95]. */
  private confidence(seed: number, idx: number): number {
    const v = (this.hash(`${seed}:${idx}`) % 350) / 1000;
    return Math.round((0.6 + v) * 100) / 100;
  }

  /** Northern-hemisphere season for the current UTC month. */
  private currentSeason(): AiSeason {
    const month = new Date().getUTCMonth(); // 0-11
    if (month <= 1 || month === 11) return 'WINTER';
    if (month <= 4) return 'SPRING';
    if (month <= 7) return 'SUMMER';
    return 'AUTUMN';
  }
}
