import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type BlogPost, type GalleryItem, type Testimonial } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { ContentService } from './content.service';

/** Minimal in-memory Prisma double; deep flows are covered in e2e. */
type PrismaMock = {
  blogPost: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  galleryItem: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  testimonial: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const TENANT = 'tenant_1';

function buildPost(overrides: Partial<BlogPost> = {}): BlogPost {
  const now = new Date();
  return {
    id: 'post_1',
    tenantId: TENANT,
    slug: 'hola-mundo',
    title: 'Hola mundo',
    excerpt: null,
    coverUrl: null,
    contentMdx: '# Hola',
    tags: [],
    published: false,
    publishedAt: null,
    authorId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildGalleryItem(overrides: Partial<GalleryItem> = {}): GalleryItem {
  const now = new Date();
  return {
    id: 'gal_1',
    tenantId: TENANT,
    url: 'https://cdn/x.jpg',
    category: null,
    isBeforeAfter: false,
    beforeUrl: null,
    afterUrl: null,
    caption: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildTestimonial(overrides: Partial<Testimonial> = {}): Testimonial {
  const now = new Date();
  return {
    id: 'tst_1',
    tenantId: TENANT,
    clientName: 'María',
    rating: 5,
    text: 'Genial',
    avatarUrl: null,
    approved: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ContentService', () => {
  let service: ContentService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      blogPost: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      galleryItem: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      testimonial: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ContentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ContentService);
  });

  describe('createPost', () => {
    it('rechaza un slug ya usado en el salón', async () => {
      prisma.blogPost.findFirst.mockResolvedValue({ id: 'post_x' });

      await expect(
        service.createPost(TENANT, {
          slug: 'hola-mundo',
          title: 'Hola',
          contentMdx: '# Hola',
        }, 'user_1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.blogPost.create).not.toHaveBeenCalled();
    });

    it('sella publishedAt al publicar y persiste el autor', async () => {
      prisma.blogPost.findFirst.mockResolvedValue(null);
      prisma.blogPost.create.mockResolvedValue(buildPost({ published: true }));

      await service.createPost(TENANT, {
        slug: 'hola-mundo',
        title: '  Hola  ',
        contentMdx: '# Hola',
        published: true,
      }, 'user_1');

      const arg = prisma.blogPost.create.mock.calls[0][0];
      expect(arg.data).toEqual(
        expect.objectContaining({ tenantId: TENANT, title: 'Hola', published: true, authorId: 'user_1' }),
      );
      expect(arg.data.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('getPublishedBySlug', () => {
    it('lanza NotFound si no hay artículo publicado con ese slug', async () => {
      prisma.blogPost.findFirst.mockResolvedValue(null);

      await expect(service.getPublishedBySlug(TENANT, 'inexistente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.blogPost.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT, slug: 'inexistente', published: true },
      });
    });
  });

  describe('listPublicGallery', () => {
    it('filtra por tenant, categoría y antes/después', async () => {
      prisma.galleryItem.findMany.mockResolvedValue([buildGalleryItem()]);

      await service.listPublicGallery(TENANT, { category: 'nail-art', isBeforeAfter: true });

      expect(prisma.galleryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, category: 'nail-art', isBeforeAfter: true },
        }),
      );
    });
  });

  describe('listApprovedTestimonials', () => {
    it('solo devuelve testimonios aprobados del salón', async () => {
      prisma.testimonial.findMany.mockResolvedValue([buildTestimonial({ approved: true })]);

      await service.listApprovedTestimonials(TENANT);

      expect(prisma.testimonial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT, approved: true } }),
      );
    });
  });

  describe('setTestimonialApproval', () => {
    it('lanza NotFound si el testimonio no pertenece al salón', async () => {
      prisma.testimonial.findFirst.mockResolvedValue(null);

      await expect(service.setTestimonialApproval(TENANT, 'tst_x', true)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.testimonial.update).not.toHaveBeenCalled();
    });

    it('actualiza el estado de aprobación cuando existe', async () => {
      prisma.testimonial.findFirst.mockResolvedValue(buildTestimonial());
      prisma.testimonial.update.mockResolvedValue(buildTestimonial({ approved: true }));

      await service.setTestimonialApproval(TENANT, 'tst_1', true);

      expect(prisma.testimonial.update).toHaveBeenCalledWith({
        where: { id: 'tst_1' },
        data: { approved: true },
      });
    });
  });
});
