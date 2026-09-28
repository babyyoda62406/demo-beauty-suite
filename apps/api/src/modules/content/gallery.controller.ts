import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type GalleryItem } from '@prisma/client';

import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { requireTenant } from './require-tenant';
import { ContentService } from './content.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { PublicGalleryQueryDto, QueryGalleryDto } from './dto/query-gallery.dto';
import { UpdateGalleryItemDto } from './dto/update-gallery-item.dto';

/**
 * Public gallery. Public reads expose the tenant's gallery with optional
 * category / before-after filters (marketing site); management routes are
 * tenant-scoped and gated by role (SPEC §4/§7/§9).
 */
@ApiTags('content')
@Controller('content/gallery')
export class GalleryController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Galería del salón (web pública), con filtros de categoría/antes-después.' })
  listPublic(
    @TenantId() tenantId: string | null,
    @Query() query: PublicGalleryQueryDto,
  ): Promise<GalleryItem[]> {
    return this.content.listPublicGallery(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('manage')
  @ApiOperation({ summary: 'Lista paginada de galería (admin).' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryGalleryDto,
  ): Promise<PaginatedResult<GalleryItem>> {
    return this.content.listGallery(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('manage/:id')
  @ApiOperation({ summary: 'Obtiene un elemento de galería por id (admin).' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<GalleryItem> {
    return this.content.getGalleryItem(requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un elemento de galería.' })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateGalleryItemDto,
  ): Promise<GalleryItem> {
    return this.content.createGalleryItem(requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un elemento de galería.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateGalleryItemDto,
  ): Promise<GalleryItem> {
    return this.content.updateGalleryItem(requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un elemento de galería.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.content.deleteGalleryItem(requireTenant(tenantId), id);
  }
}
