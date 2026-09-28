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
import { type Testimonial } from '@prisma/client';

import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { requireTenant } from './require-tenant';
import { ContentService } from './content.service';
import { ApproveTestimonialDto } from './dto/approve-testimonial.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { QueryTestimonialsDto } from './dto/query-testimonials.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

/**
 * Public testimonials. Public reads expose only approved testimonials
 * (marketing site); management routes (including approval) are tenant-scoped
 * and gated by role (SPEC §4/§7/§9).
 */
@ApiTags('content')
@Controller('content/testimonials')
export class TestimonialsController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Testimonios aprobados del salón (web pública).' })
  listPublic(@TenantId() tenantId: string | null): Promise<Testimonial[]> {
    return this.content.listApprovedTestimonials(requireTenant(tenantId));
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('manage')
  @ApiOperation({ summary: 'Lista paginada de testimonios (admin), incluye pendientes.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryTestimonialsDto,
  ): Promise<PaginatedResult<Testimonial>> {
    return this.content.listTestimonials(requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('manage/:id')
  @ApiOperation({ summary: 'Obtiene un testimonio por id (admin).' })
  get(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<Testimonial> {
    return this.content.getTestimonial(requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un testimonio (pendiente de aprobación salvo indicación).' })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateTestimonialDto,
  ): Promise<Testimonial> {
    return this.content.createTestimonial(requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un testimonio.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto,
  ): Promise<Testimonial> {
    return this.content.updateTestimonial(requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id/approval')
  @ApiOperation({ summary: 'Aprueba o retira la aprobación de un testimonio.' })
  approve(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: ApproveTestimonialDto,
  ): Promise<Testimonial> {
    return this.content.setTestimonialApproval(requireTenant(tenantId), id, dto.approved ?? true);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un testimonio.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.content.deleteTestimonial(requireTenant(tenantId), id);
  }
}
