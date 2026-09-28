import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TimeOffKind, TimeOffStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

/** Time-off period for a professional (vacation, sick leave, etc.). */
export class CreateTimeOffDto {
  @ApiProperty({ description: 'Profesional al que aplica el permiso.' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: '2026-08-15T00:00:00.000Z', description: 'Inicio (ISO-8601 UTC).' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ example: '2026-08-20T23:59:59.999Z', description: 'Fin (ISO-8601 UTC).' })
  @IsISO8601()
  endAt!: string;

  @ApiPropertyOptional({ enum: TimeOffKind, default: TimeOffKind.VACATION })
  @IsOptional()
  @IsEnum(TimeOffKind)
  kind?: TimeOffKind;

  @ApiPropertyOptional({ enum: TimeOffStatus, default: TimeOffStatus.PENDING })
  @IsOptional()
  @IsEnum(TimeOffStatus)
  status?: TimeOffStatus;
}

/** Partial update for a time-off row (e.g. approve/reject). */
export class UpdateTimeOffDto extends PartialType(CreateTimeOffDto) {}
