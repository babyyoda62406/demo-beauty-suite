import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiSuggestionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for browsing persisted AI suggestions (history). */
export class QueryAiSuggestionsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AiSuggestionType, description: 'Filtra por tipo de sugerencia.' })
  @IsOptional()
  @IsEnum(AiSuggestionType)
  type?: AiSuggestionType;

  @ApiPropertyOptional({ description: 'Filtra por clienta.' })
  @IsOptional()
  @IsString()
  clientId?: string;
}
