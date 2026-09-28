import { PartialType } from '@nestjs/swagger';

import { CreateBlogPostDto } from './create-blog-post.dto';

/** Partial payload to update a blog post (all fields optional). */
export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}
