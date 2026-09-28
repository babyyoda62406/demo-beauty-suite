import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type BlogPost,
  type GalleryItem,
  type Prisma,
  type Testimonial,
} from '@prisma/client';

import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateBlogPostDto } from './dto/create-blog-post.dto';
import { type CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { type CreateTestimonialDto } from './dto/create-testimonial.dto';
import { type PublicGalleryQueryDto, type QueryGalleryDto } from './dto/query-gallery.dto';
import { type QueryBlogPostsDto } from './dto/query-blog-posts.dto';
import { type QueryTestimonialsDto } from './dto/query-testimonials.dto';
import { type UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { type UpdateGalleryItemDto } from './dto/update-gallery-item.dto';
import { type UpdateTestimonialDto } from './dto/update-testimonial.dto';

/** Whitelisted, safe columns for blog ordering (avoids injection via sortBy). */
const BLOG_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'title',
  'publishedAt',
  'createdAt',
  'updatedAt',
]);

/**
 * Public-content domain service: blog posts (MDX), gallery items and
 * testimonials — all strictly tenant-scoped (SPEC §3/§6). Public reads only
 * surface published / approved rows; single-row updates and deletes verify
 * tenant ownership first, since the Prisma middleware cannot scope
 * unique-`where` writes (see `PrismaService`).
 */
@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Blog: public reads ----------------------------------------------------

  /** Public paginated listing of published posts, newest first. */
  async listPublishedPosts(
    tenantId: string,
    query: QueryBlogPostsDto,
  ): Promise<PaginatedResult<BlogPost>> {
    const where: Prisma.BlogPostWhereInput = { tenantId, published: true };
    if (query.tag) where.tags = { has: query.tag };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.resolveBlogOrder(query.sortBy, query.sortOrder, 'publishedAt');
    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.blogPost.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /** Public single published post by slug (feeds the public post page). */
  async getPublishedBySlug(tenantId: string, slug: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findFirst({
      where: { tenantId, slug, published: true },
    });
    if (!post) {
      throw new NotFoundException('Artículo no encontrado');
    }
    return post;
  }

  // --- Blog: staff CRUD ------------------------------------------------------

  /** Admin paginated listing (includes drafts), newest first. */
  async listPosts(
    tenantId: string,
    query: QueryBlogPostsDto,
  ): Promise<PaginatedResult<BlogPost>> {
    const where: Prisma.BlogPostWhereInput = { tenantId };
    if (query.published !== undefined) where.published = query.published;
    if (query.tag) where.tags = { has: query.tag };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.resolveBlogOrder(query.sortBy, query.sortOrder, 'createdAt');
    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.blogPost.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getPost(tenantId: string, id: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findFirst({ where: { id, tenantId } });
    if (!post) {
      throw new NotFoundException('Artículo no encontrado');
    }
    return post;
  }

  async createPost(
    tenantId: string,
    dto: CreateBlogPostDto,
    authorId: string | null,
  ): Promise<BlogPost> {
    const slug = dto.slug.trim();
    await this.assertSlugAvailable(tenantId, slug, null);

    const published = dto.published ?? false;
    return this.prisma.blogPost.create({
      data: {
        tenantId,
        slug,
        title: dto.title.trim(),
        excerpt: dto.excerpt ?? null,
        coverUrl: dto.coverUrl ?? null,
        contentMdx: dto.contentMdx,
        tags: dto.tags ?? [],
        published,
        publishedAt: this.resolvePublishedAt(published, dto.publishedAt, null),
        authorId,
      },
    });
  }

  async updatePost(tenantId: string, id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const current = await this.getPost(tenantId, id);

    const data: Prisma.BlogPostUpdateInput = {};
    if (dto.slug !== undefined) {
      const slug = dto.slug.trim();
      await this.assertSlugAvailable(tenantId, slug, id);
      data.slug = slug;
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt ?? null;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl ?? null;
    if (dto.contentMdx !== undefined) data.contentMdx = dto.contentMdx;
    if (dto.tags !== undefined) data.tags = dto.tags;

    const nextPublished = dto.published ?? current.published;
    if (dto.published !== undefined) data.published = dto.published;
    if (dto.publishedAt !== undefined) {
      data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    } else if (dto.published !== undefined) {
      // Stamp/clear publishedAt to match the new published state when the
      // caller flips the flag without supplying an explicit date.
      data.publishedAt = this.resolvePublishedAt(nextPublished, undefined, current.publishedAt);
    }

    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async deletePost(tenantId: string, id: string): Promise<void> {
    await this.getPost(tenantId, id);
    await this.prisma.blogPost.delete({ where: { id } });
  }

  // --- Gallery ---------------------------------------------------------------

  /** Public gallery, filtered by category / before-after, ordered for display. */
  async listPublicGallery(
    tenantId: string,
    filter: PublicGalleryQueryDto,
  ): Promise<GalleryItem[]> {
    const where: Prisma.GalleryItemWhereInput = { tenantId };
    if (filter.category !== undefined) where.category = filter.category;
    if (filter.isBeforeAfter !== undefined) where.isBeforeAfter = filter.isBeforeAfter;
    return this.prisma.galleryItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Admin paginated gallery listing. */
  async listGallery(
    tenantId: string,
    query: QueryGalleryDto,
  ): Promise<PaginatedResult<GalleryItem>> {
    const where: Prisma.GalleryItemWhereInput = { tenantId };
    if (query.category !== undefined) where.category = query.category;
    if (query.isBeforeAfter !== undefined) where.isBeforeAfter = query.isBeforeAfter;

    const [data, total] = await Promise.all([
      this.prisma.galleryItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.galleryItem.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getGalleryItem(tenantId: string, id: string): Promise<GalleryItem> {
    const item = await this.prisma.galleryItem.findFirst({ where: { id, tenantId } });
    if (!item) {
      throw new NotFoundException('Elemento de galería no encontrado');
    }
    return item;
  }

  async createGalleryItem(tenantId: string, dto: CreateGalleryItemDto): Promise<GalleryItem> {
    return this.prisma.galleryItem.create({
      data: {
        tenantId,
        url: dto.url,
        category: dto.category ?? null,
        isBeforeAfter: dto.isBeforeAfter ?? false,
        beforeUrl: dto.beforeUrl ?? null,
        afterUrl: dto.afterUrl ?? null,
        caption: dto.caption ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateGalleryItem(
    tenantId: string,
    id: string,
    dto: UpdateGalleryItemDto,
  ): Promise<GalleryItem> {
    await this.getGalleryItem(tenantId, id);

    const data: Prisma.GalleryItemUpdateInput = {};
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.category !== undefined) data.category = dto.category ?? null;
    if (dto.isBeforeAfter !== undefined) data.isBeforeAfter = dto.isBeforeAfter;
    if (dto.beforeUrl !== undefined) data.beforeUrl = dto.beforeUrl ?? null;
    if (dto.afterUrl !== undefined) data.afterUrl = dto.afterUrl ?? null;
    if (dto.caption !== undefined) data.caption = dto.caption ?? null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.galleryItem.update({ where: { id }, data });
  }

  async deleteGalleryItem(tenantId: string, id: string): Promise<void> {
    await this.getGalleryItem(tenantId, id);
    await this.prisma.galleryItem.delete({ where: { id } });
  }

  // --- Testimonials ----------------------------------------------------------

  /** Public listing of approved testimonials, newest first. */
  async listApprovedTestimonials(tenantId: string): Promise<Testimonial[]> {
    return this.prisma.testimonial.findMany({
      where: { tenantId, approved: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Admin paginated testimonial listing, with an optional approval filter. */
  async listTestimonials(
    tenantId: string,
    query: QueryTestimonialsDto,
  ): Promise<PaginatedResult<Testimonial>> {
    const where: Prisma.TestimonialWhereInput = { tenantId };
    if (query.approved !== undefined) where.approved = query.approved;
    if (query.search) {
      where.OR = [
        { clientName: { contains: query.search, mode: 'insensitive' } },
        { text: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.testimonial.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getTestimonial(tenantId: string, id: string): Promise<Testimonial> {
    const testimonial = await this.prisma.testimonial.findFirst({ where: { id, tenantId } });
    if (!testimonial) {
      throw new NotFoundException('Testimonio no encontrado');
    }
    return testimonial;
  }

  async createTestimonial(tenantId: string, dto: CreateTestimonialDto): Promise<Testimonial> {
    return this.prisma.testimonial.create({
      data: {
        tenantId,
        clientName: dto.clientName.trim(),
        rating: dto.rating,
        text: dto.text.trim(),
        avatarUrl: dto.avatarUrl ?? null,
        approved: dto.approved ?? false,
      },
    });
  }

  async updateTestimonial(
    tenantId: string,
    id: string,
    dto: UpdateTestimonialDto,
  ): Promise<Testimonial> {
    await this.getTestimonial(tenantId, id);

    const data: Prisma.TestimonialUpdateInput = {};
    if (dto.clientName !== undefined) data.clientName = dto.clientName.trim();
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.text !== undefined) data.text = dto.text.trim();
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl ?? null;
    if (dto.approved !== undefined) data.approved = dto.approved;

    return this.prisma.testimonial.update({ where: { id }, data });
  }

  /** Approves (or unapproves) a testimonial for the public site. */
  async setTestimonialApproval(
    tenantId: string,
    id: string,
    approved: boolean,
  ): Promise<Testimonial> {
    await this.getTestimonial(tenantId, id);
    return this.prisma.testimonial.update({ where: { id }, data: { approved } });
  }

  async deleteTestimonial(tenantId: string, id: string): Promise<void> {
    await this.getTestimonial(tenantId, id);
    await this.prisma.testimonial.delete({ where: { id } });
  }

  // --- helpers ---------------------------------------------------------------

  /** Rejects a slug already used by another post in the same tenant. */
  private async assertSlugAvailable(
    tenantId: string,
    slug: string,
    excludeId: string | null,
  ): Promise<void> {
    const clash = await this.prisma.blogPost.findFirst({
      where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException('Ya existe un artículo con ese slug');
    }
  }

  /**
   * Resolves the `publishedAt` timestamp: an explicit date wins; otherwise it is
   * stamped when publishing (reusing any existing value) and cleared when not.
   */
  private resolvePublishedAt(
    published: boolean,
    explicit: string | undefined,
    existing: Date | null,
  ): Date | null {
    if (explicit !== undefined) return new Date(explicit);
    if (!published) return null;
    return existing ?? new Date();
  }

  private resolveBlogOrder(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
    fallback: string,
  ): Prisma.BlogPostOrderByWithRelationInput {
    const field = sortBy && BLOG_SORT_FIELDS.has(sortBy) ? sortBy : fallback;
    return { [field]: sortOrder };
  }
}
