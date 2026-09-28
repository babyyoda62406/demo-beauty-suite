import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma, type Voucher, VoucherStatus } from '@prisma/client';

import { buildPaginatedResult, type PaginatedResult } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateVoucherDto } from './dto/create-voucher.dto';
import { type QueryVouchersDto } from './dto/query-vouchers.dto';

/** A voucher plus its derived remaining-sessions balance. */
export type VoucherWithBalance = Voucher & { remainingSessions: number };

/** Lo que necesita el listado del panel: el bono, su saldo y de quién es. */
export type VoucherListado = VoucherWithBalance & {
  client: { id: string; name: string; phone: string | null } | null;
};

/**
 * Vouchers (bonos) domain service (SPEC §6/§7). A voucher prepays N sessions of
 * a service; sessions are consumed one at a time until exhausted (`USED`) or the
 * voucher expires. All operations are tenant-scoped (SPEC §3) on top of the
 * Prisma tenant middleware; single-row writes act on ids already verified to
 * belong to the salon.
 */
@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sells a voucher of `totalSessions` prepaid sessions to a client. */
  async create(tenantId: string, dto: CreateVoucherDto): Promise<VoucherWithBalance> {
    await this.assertClientExists(tenantId, dto.clientId);
    const serviceId = dto.serviceId ?? null;
    if (serviceId) {
      await this.assertServiceExists(tenantId, serviceId);
    }
    const voucher = await this.prisma.voucher.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        serviceId,
        totalSessions: dto.totalSessions,
        price: dto.price,
        currency: dto.currency ?? 'EUR',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: VoucherStatus.ACTIVE,
      },
    });
    return this.withBalance(voucher);
  }

  /**
   * Admin paginated listing, filtered by client and/or status.
   *
   * Trae la clienta y las sesiones que quedan: un listado de bonos sin saber de
   * quién es cada uno no le sirve de nada a quien atiende el salón.
   */
  async list(tenantId: string, query: QueryVouchersDto): Promise<PaginatedResult<VoucherListado>> {
    const where: Prisma.VoucherWhereInput = { tenantId };
    if (query.clientId !== undefined) where.clientId = query.clientId;
    if (query.status !== undefined) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
        include: { client: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.voucher.count({ where }),
    ]);
    const conSaldo = data.map(({ client, ...voucher }) => ({
      ...this.withBalance(voucher),
      client,
    }));
    return buildPaginatedResult(conSaldo, total, query);
  }

  /** Fetches a voucher (tenant-scoped) with its remaining-sessions balance. */
  async get(tenantId: string, id: string): Promise<VoucherWithBalance> {
    return this.withBalance(await this.getBase(tenantId, id));
  }

  /**
   * Consumes one session from a voucher. Marks it `USED` once exhausted, or
   * `EXPIRED` (and rejects) if past its expiry date. Rejects non-`ACTIVE`
   * vouchers.
   */
  async consume(tenantId: string, id: string): Promise<VoucherWithBalance> {
    const voucher = await this.getBase(tenantId, id);

    if (voucher.status !== VoucherStatus.ACTIVE) {
      throw new BadRequestException('El bono no está activo');
    }
    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      await this.prisma.voucher.update({
        where: { id },
        data: { status: VoucherStatus.EXPIRED },
      });
      throw new BadRequestException('El bono ha caducado');
    }
    if (voucher.usedSessions >= voucher.totalSessions) {
      throw new BadRequestException('El bono no tiene sesiones disponibles');
    }

    const usedSessions = voucher.usedSessions + 1;
    const status =
      usedSessions >= voucher.totalSessions ? VoucherStatus.USED : VoucherStatus.ACTIVE;
    const updated = await this.prisma.voucher.update({
      where: { id },
      data: { usedSessions, status },
    });
    return this.withBalance(updated);
  }

  /** Cancels a voucher (no further sessions can be consumed). */
  async cancel(tenantId: string, id: string): Promise<VoucherWithBalance> {
    const voucher = await this.getBase(tenantId, id);
    if (voucher.status === VoucherStatus.CANCELLED) {
      return this.withBalance(voucher);
    }
    const updated = await this.prisma.voucher.update({
      where: { id },
      data: { status: VoucherStatus.CANCELLED },
    });
    return this.withBalance(updated);
  }

  /** Lists the authenticated client's own vouchers. */
  async listMine(tenantId: string, userId: string): Promise<VoucherWithBalance[]> {
    const clientId = await this.resolveClientId(tenantId, userId);
    const vouchers = await this.prisma.voucher.findMany({
      where: { tenantId, clientId },
      orderBy: { createdAt: 'desc' },
    });
    return vouchers.map((voucher) => this.withBalance(voucher));
  }

  // --- helpers ---------------------------------------------------------------

  private async getBase(tenantId: string, id: string): Promise<Voucher> {
    const voucher = await this.prisma.voucher.findFirst({ where: { id, tenantId } });
    if (!voucher) {
      throw new NotFoundException('Bono no encontrado');
    }
    return voucher;
  }

  private withBalance(voucher: Voucher): VoucherWithBalance {
    return {
      ...voucher,
      remainingSessions: Math.max(voucher.totalSessions - voucher.usedSessions, 0),
    };
  }

  private async assertClientExists(tenantId: string, clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
    if (!client) {
      throw new BadRequestException('La clienta indicada no existe en este salón');
    }
  }

  private async assertServiceExists(tenantId: string, serviceId: string): Promise<void> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
      select: { id: true },
    });
    if (!service) {
      throw new BadRequestException('El servicio indicado no existe en este salón');
    }
  }

  private async resolveClientId(tenantId: string, userId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    if (!client) {
      throw new ForbiddenException('No hay una ficha de clienta asociada a tu cuenta');
    }
    return client.id;
  }
}
