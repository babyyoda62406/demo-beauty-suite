import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Payload to update an invoice's status or attached PDF url. */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/facturas/INV-000001.pdf', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pdfUrl?: string;
}
