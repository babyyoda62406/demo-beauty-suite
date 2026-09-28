import { Module } from '@nestjs/common';

import { BlogController } from './blog.controller';
import { ContentService } from './content.service';
import { GalleryController } from './gallery.controller';
import { TestimonialsController } from './testimonials.controller';

/**
 * Public-content module — blog (MDX), gallery and testimonials
 * (SPEC §7 `content`). Registered centrally in `app.module.ts` during the
 * integration phase.
 */
@Module({
  controllers: [BlogController, GalleryController, TestimonialsController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
