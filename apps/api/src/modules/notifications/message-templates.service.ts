import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageChannel, type MessageTemplate, type Prisma } from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { type QueryMessageTemplatesDto } from './dto/query-message-templates.dto';
import { type UpdateMessageTemplateDto } from './dto/update-message-template.dto';

/**
 * Message templates domain service (SPEC §6/§7). Staff-managed catalogue of
 * per-channel message bodies keyed by a logical `key`; the tuple
 * `(tenantId, channel, key)` is unique. Strictly tenant-scoped (SPEC §3):
 * single-row writes resolve the id within the salon first, since the Prisma
 * middleware cannot scope unique-`where` writes (see `PrismaService`).
 */
@Injectable()
export class MessageTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a template, rejecting a duplicate `(channel, key)` within the salon. */
  async create(tenantId: string, dto: CreateMessageTemplateDto): Promise<MessageTemplate> {
    const channel = dto.channel ?? MessageChannel.EMAIL;
    const key = dto.key.trim();
    await this.assertKeyAvailable(tenantId, channel, key, null);

    return this.prisma.messageTemplate.create({
      data: {
        tenantId,
        channel,
        key,
        subject: dto.subject?.trim() ?? null,
        body: dto.body,
      },
    });
  }

  /** Paginated listing of templates, optionally filtered by channel. */
  async list(
    tenantId: string,
    query: QueryMessageTemplatesDto,
  ): Promise<PaginatedResult<MessageTemplate>> {
    const where: Prisma.MessageTemplateWhereInput = { tenantId };
    if (query.channel !== undefined) where.channel = query.channel;

    const [data, total] = await Promise.all([
      this.prisma.messageTemplate.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.messageTemplate.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  /** Fetches a single template, enforcing tenant ownership. */
  async get(tenantId: string, id: string): Promise<MessageTemplate> {
    const template = await this.prisma.messageTemplate.findFirst({ where: { id, tenantId } });
    if (!template) {
      throw new NotFoundException('Plantilla de mensaje no encontrada');
    }
    return template;
  }

  /** Partial update, re-checking `(channel, key)` uniqueness when either changes. */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateMessageTemplateDto,
  ): Promise<MessageTemplate> {
    const template = await this.get(tenantId, id);

    const channel = dto.channel ?? template.channel;
    const key = dto.key !== undefined ? dto.key.trim() : template.key;
    if (channel !== template.channel || key !== template.key) {
      await this.assertKeyAvailable(tenantId, channel, key, template.id);
    }

    const data: Prisma.MessageTemplateUpdateInput = {};
    if (dto.channel !== undefined) data.channel = channel;
    if (dto.key !== undefined) data.key = key;
    if (dto.subject !== undefined) data.subject = dto.subject?.trim() ?? null;
    if (dto.body !== undefined) data.body = dto.body;

    return this.prisma.messageTemplate.update({
      where: { id: template.id },
      data,
    });
  }

  /** Deletes a template (tenant-scoped). */
  async remove(tenantId: string, id: string): Promise<{ success: true }> {
    const template = await this.get(tenantId, id);
    await this.prisma.messageTemplate.delete({ where: { id: template.id } });
    return { success: true };
  }

  /** Ensures no other template in the salon uses the same `(channel, key)`. */
  private async assertKeyAvailable(
    tenantId: string,
    channel: MessageChannel,
    key: string,
    exceptId: string | null,
  ): Promise<void> {
    const existing = await this.prisma.messageTemplate.findFirst({
      where: { tenantId, channel, key },
      select: { id: true },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ya existe una plantilla con ese canal y clave');
    }
  }
}
