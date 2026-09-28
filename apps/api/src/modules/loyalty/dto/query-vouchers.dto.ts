import { ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/pagination.dto';

/** Admin query for listing vouchers, filtered by client and/or status. */
export class QueryVouchersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtra por clienta.' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ enum: VoucherStatus, description: 'Filtra por estado del bono.' })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;
}
