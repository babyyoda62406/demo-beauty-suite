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
import { type BlogPost } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { requireTenant } from './require-tenant';
import { ContentService } from './content.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { QueryBlogPostsDto } from './dto/query-blog-posts.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

/**
 * Public blog. Public reads expose only published posts for the resolved
 * tenant (marketing site); management routes are tenant-scoped and gated by
 * role (SPEC §4/§7/§9). Static management routes are declared before the
 * public `:slug` route so they are matched literally.
 */
@ApiTags('content')
@Controller('content/blog')
export class BlogController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Artículos publicados del salón (web pública), paginados.' })
  listPublic(
    @TenantId() tenantId: string | null,
    @Query() query: QueryBlogPostsDto,
  ): Promise<PaginatedResult<BlogPost>> {
    return this.content.listPublishedPosts(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('manage')
  @ApiOperation({ summary: 'Lista paginada de artículos (admin), incluye borradores.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryBlogPostsDto,
  ): Promise<PaginatedResult<BlogPost>> {
    return this.content.listPosts(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('manage/:id')
  @ApiOperation({ summary: 'Obtiene un artículo por id (admin).' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<BlogPost> {
    return this.content.getPost(requireTenant(tenantId), id);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Artículo publicado por slug (web pública).' })
  getBySlug(
    @TenantId() tenantId: string | null,
    @Param('slug') slug: string,
  ): Promise<BlogPost> {
    return this.content.getPublishedBySlug(requireTenant(tenantId), slug);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un artículo (MDX).' })
  create(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBlogPostDto,
  ): Promise<BlogPost> {
    return this.content.createPost(requireTenant(tenantId), dto, userId ?? null);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un artículo.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ): Promise<BlogPost> {
    return this.content.updatePost(requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un artículo.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.content.deletePost(requireTenant(tenantId), id);
  }
}
