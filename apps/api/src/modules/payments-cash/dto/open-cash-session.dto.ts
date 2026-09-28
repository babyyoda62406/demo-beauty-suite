import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/** Payload to open a cash session with a starting float (cents). */
export class OpenCashSessionDto {
  @ApiProperty({ example: 10000, minimum: 0, description: 'Fondo de caja inicial en céntimos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  openingFloat!: number;

  @ApiPropertyOptional({ example: 'EUR', minLength: 3, maxLength: 3, default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
