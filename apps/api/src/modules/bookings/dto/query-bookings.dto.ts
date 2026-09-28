import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/**
 * Admin agenda query (SPEC §7 — day/week/month views). Bookings are filtered by
 * the `[from, to]` window on `startAt`, optionally by professional and status.
 */
export class QueryBookingsDto extends PaginationDto {
  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z', description: 'Desde (inclusive, ISO-8601 UTC).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.999Z', description: 'Hasta (inclusive, ISO-8601 UTC).' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtra por profesional.' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: BookingStatus, description: 'Filtra por estado.' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
