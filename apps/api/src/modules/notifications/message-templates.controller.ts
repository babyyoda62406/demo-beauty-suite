import {
  BadRequestException,
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
import { type MessageTemplate } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { QueryMessageTemplatesDto } from './dto/query-message-templates.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { MessageTemplatesService } from './message-templates.service';

/**
 * Message template administration (SPEC §7). Staff (OWNER/MANAGER/EMPLOYEE)
 * manage the per-channel templates of their salon; all routes are tenant-scoped.
 */
@ApiTags('notifications')
@Roles('OWNER', 'MANAGER', 'EMPLOYEE')
@Controller('message-templates')
export class MessageTemplatesController {
  constructor(private readonly templates: MessageTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista paginada de plantillas de mensaje (filtro por canal).' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: QueryMessageTemplatesDto,
  ): Promise<PaginatedResult<MessageTemplate>> {
    return this.templates.list(this.requireTenant(tenantId), query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una plantilla de mensaje.' })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateMessageTemplateDto,
  ): Promise<MessageTemplate> {
    return this.templates.create(this.requireTenant(tenantId), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una plantilla de mensaje.' })
  get(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<MessageTemplate> {
    return this.templates.get(this.requireTenant(tenantId), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza parcialmente una plantilla de mensaje.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateMessageTemplateDto,
  ): Promise<MessageTemplate> {
    return this.templates.update(this.requireTenant(tenantId), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una plantilla de mensaje.' })
  remove(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.templates.remove(this.requireTenant(tenantId), id);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
