import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Payload to create a service category. Categories are tenant-scoped; the
 * `tenantId` is injected by the tenant-aware Prisma layer and never accepted
 * from the client (SPEC §3).
 */
export class CreateServiceCategoryDto {
  @ApiProperty({ example: 'Manicura', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 0, minimum: 0, description: 'Orden de aparición (asc).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
