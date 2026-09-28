import { ApiProperty } from '@nestjs/swagger';

/**
 * Minimal public branding projection served by slug for white-label rendering
 * (SPEC §3). Contains no sensitive tenant data — only what the storefront needs.
 */
export class BrandingResponseDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  brand!: Record<string, unknown>;

  @ApiProperty()
  locale!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  timezone!: string;
}
