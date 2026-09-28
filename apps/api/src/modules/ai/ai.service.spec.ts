import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type AiSuggestion, AiSuggestionType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { AiService } from './ai.service';

const TENANT = 'tenant_1';

function buildSuggestion(overrides: Partial<AiSuggestion> = {}): AiSuggestion {
  return {
    id: 'ai_1',
    tenantId: TENANT,
    clientId: null,
    type: AiSuggestionType.DESIGN,
    input: {},
    output: {},
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AiService', () => {
  let service: AiService;
  let prisma: {
    aiSuggestion: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    client: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      aiSuggestion: {
        create: jest.fn((args: { data: Partial<AiSuggestion> }) =>
          Promise.resolve(buildSuggestion(args.data)),
        ),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      client: { findFirst: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [AiService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AiService);
  });

  describe('recommendDesigns', () => {
    it('persiste una sugerencia DESIGN con salida determinista', async () => {
      const first = await service.recommendDesigns(TENANT, {
        season: 'SUMMER',
        preferences: ['glitter'],
        limit: 3,
      });

      expect(prisma.aiSuggestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT, type: AiSuggestionType.DESIGN }),
        }),
      );
      const output = first.output as { season: string; designs: unknown[] };
      expect(output.season).toBe('SUMMER');
      expect(output.designs).toHaveLength(3);

      // Determinismo: misma entrada → misma salida.
      const createArgs = prisma.aiSuggestion.create.mock.calls[0][0] as { data: { output: unknown } };
      const second = await service.recommendDesigns(TENANT, {
        season: 'SUMMER',
        preferences: ['glitter'],
        limit: 3,
      });
      const secondArgs = prisma.aiSuggestion.create.mock.calls[1][0] as { data: { output: unknown } };
      expect(secondArgs.data.output).toEqual(createArgs.data.output);
      expect(second.type).toBe(AiSuggestionType.DESIGN);
    });
  });

  describe('suggestColors', () => {
    it('antepone el color base y guarda tipo COLOR', async () => {
      const result = await service.suggestColors(TENANT, {
        baseColor: '#abcdef',
        season: 'WINTER',
        count: 4,
      });
      const output = result.output as { palette: { hex: string; role: string }[] };
      expect(output.palette[0]).toEqual({ hex: '#ABCDEF', role: 'primary' });
      expect(output.palette).toHaveLength(4);
    });
  });

  describe('analyzeHand', () => {
    it('devuelve observaciones para la URL de la foto', async () => {
      const result = await service.analyzeHand(TENANT, {
        photoUrl: 'https://cdn.example.com/x.jpg',
      });
      const output = result.output as { observations: { recommendedShape: string } };
      expect(output.observations.recommendedShape).toBeDefined();
      expect(result.type).toBe(AiSuggestionType.OTHER);
    });
  });

  describe('resolveClientId', () => {
    it('rechaza una clienta inexistente en el salón', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.suggestColors(TENANT, { clientId: 'nope' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.aiSuggestion.create).not.toHaveBeenCalled();
    });
  });
});
