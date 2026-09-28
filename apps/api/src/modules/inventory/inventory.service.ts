import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Prisma,
  type Product,
  type StockMovement,
  StockMovementKind,
  type Supplier,
} from '@prisma/client';

import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { type CreateProductDto } from './dto/create-product.dto';
import { type CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { type CreateSupplierDto } from './dto/create-supplier.dto';
import { type QueryLowStockDto } from './dto/query-low-stock.dto';
import { type QueryProductsDto } from './dto/query-products.dto';
import { type QuerySuppliersDto } from './dto/query-suppliers.dto';
import { type UpdateProductDto } from './dto/update-product.dto';
import { type UpdateSupplierDto } from './dto/update-supplier.dto';

/** Whitelisted, safe columns for product ordering (avoids injection via sortBy). */
const PRODUCT_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'name',
  'sku',
  'price',
  'cost',
  'stock',
  'lowStockThreshold',
  'createdAt',
  'updatedAt',
]);

/** Whitelisted, safe columns for supplier ordering. */
const SUPPLIER_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  'name',
  'createdAt',
  'updatedAt',
]);

/**
 * Inventory domain service: CRUD for products and suppliers, plus stock
 * movements (IN/OUT/ADJUST) that update `Product.stock` transactionally and a
 * low-stock report. Everything is strictly tenant-scoped (SPEC §3/§6): reads
 * carry an explicit `tenantId` predicate on top of the Prisma tenant middleware
 * as defence-in-depth, and single-row updates/deletes resolve ownership first
 * (the middleware cannot scope unique-`where` writes — see `PrismaService`).
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Suppliers -------------------------------------------------------------

  async createSupplier(tenantId: string, dto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        contact: dto.contact ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
      },
    });
  }

  async listSuppliers(
    tenantId: string,
    query: QuerySuppliersDto,
  ): Promise<PaginatedResult<Supplier>> {
    const where: Prisma.SupplierWhereInput = { tenantId };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { contact: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const field = query.sortBy && SUPPLIER_SORT_FIELDS.has(query.sortBy) ? query.sortBy : 'name';
    const orderBy: Prisma.SupplierOrderByWithRelationInput = { [field]: query.sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.supplier.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getSupplier(tenantId: string, id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return supplier;
  }

  async updateSupplier(
    tenantId: string,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    await this.getSupplier(tenantId, id);

    const data: Prisma.SupplierUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.contact !== undefined) data.contact = dto.contact ?? null;
    if (dto.email !== undefined) data.email = dto.email ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;

    return this.prisma.supplier.update({ where: { id }, data });
  }

  async deleteSupplier(tenantId: string, id: string): Promise<void> {
    await this.getSupplier(tenantId, id);
    await this.prisma.supplier.delete({ where: { id } });
  }

  // --- Products --------------------------------------------------------------

  async createProduct(tenantId: string, dto: CreateProductDto): Promise<Product> {
    const sku = dto.sku.trim();
    await this.assertSkuAvailable(tenantId, sku);

    const supplierId = dto.supplierId ?? null;
    if (supplierId) {
      await this.assertSupplierExists(tenantId, supplierId);
    }

    return this.prisma.product.create({
      data: {
        tenantId,
        sku,
        name: dto.name.trim(),
        description: dto.description ?? null,
        category: dto.category ?? null,
        price: dto.price,
        cost: dto.cost ?? null,
        currency: dto.currency ?? 'EUR',
        stock: dto.stock ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 0,
        supplierId,
        imageUrl: dto.imageUrl ?? null,
        active: dto.active ?? true,
        isStoreItem: dto.isStoreItem ?? false,
      },
    });
  }

  async listProducts(
    tenantId: string,
    query: QueryProductsDto,
  ): Promise<PaginatedResult<Product>> {
    const where: Prisma.ProductWhereInput = { tenantId };
    if (query.category !== undefined) where.category = query.category;
    if (query.supplierId !== undefined) where.supplierId = query.supplierId;
    if (query.active !== undefined) where.active = query.active;
    if (query.isStoreItem !== undefined) where.isStoreItem = query.isStoreItem;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const field = query.sortBy && PRODUCT_SORT_FIELDS.has(query.sortBy) ? query.sortBy : 'name';
    const orderBy: Prisma.ProductOrderByWithRelationInput = { [field]: query.sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy, skip: query.skip, take: query.take }),
      this.prisma.product.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getProduct(tenantId: string, id: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async updateProduct(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    await this.getProduct(tenantId, id);

    const data: Prisma.ProductUpdateInput = {};
    if (dto.sku !== undefined) {
      const sku = dto.sku.trim();
      await this.assertSkuAvailable(tenantId, sku, id);
      data.sku = sku;
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.category !== undefined) data.category = dto.category ?? null;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.cost !== undefined) data.cost = dto.cost ?? null;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.lowStockThreshold !== undefined) data.lowStockThreshold = dto.lowStockThreshold;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl ?? null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.isStoreItem !== undefined) data.isStoreItem = dto.isStoreItem;
    if (dto.supplierId !== undefined) {
      const supplierId = dto.supplierId ?? null;
      if (supplierId) {
        await this.assertSupplierExists(tenantId, supplierId);
        data.supplier = { connect: { id: supplierId } };
      } else {
        data.supplier = { disconnect: true };
      }
    }

    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(tenantId: string, id: string): Promise<void> {
    await this.getProduct(tenantId, id);
    await this.prisma.product.delete({ where: { id } });
  }

  /**
   * Lists products whose stock has reached its low-stock threshold
   * (`stock <= lowStockThreshold`), lowest stock first. Uses a Prisma field
   * reference so the comparison runs in the database and stays paginable.
   */
  async listLowStock(
    tenantId: string,
    query: QueryLowStockDto,
  ): Promise<PaginatedResult<Product>> {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      stock: { lte: this.prisma.product.fields.lowStockThreshold },
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { stock: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.product.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  // --- Stock movements -------------------------------------------------------

  /**
   * Registers a stock movement and updates `Product.stock` atomically. IN adds,
   * OUT subtracts (never below zero) and ADJUST sets the absolute stock level.
   */
  async createStockMovement(
    tenantId: string,
    productId: string,
    dto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    const product = await this.getProduct(tenantId, productId);

    const bookingId = dto.bookingId ?? null;
    if (bookingId) {
      await this.assertBookingExists(tenantId, bookingId);
    }

    const nextStock = this.computeNextStock(product.stock, dto.kind, dto.quantity);

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { stock: nextStock } });
      return tx.stockMovement.create({
        data: {
          tenantId,
          productId,
          kind: dto.kind,
          quantity: dto.quantity,
          reason: dto.reason ?? null,
          bookingId,
        },
      });
    });
  }

  /** Paginated movement history for a product, most recent first. */
  async listStockMovements(
    tenantId: string,
    productId: string,
    query: QueryLowStockDto,
  ): Promise<PaginatedResult<StockMovement>> {
    await this.getProduct(tenantId, productId);

    const where: Prisma.StockMovementWhereInput = { tenantId, productId };
    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  // --- helpers ---------------------------------------------------------------

  /** Resolves the resulting stock for a movement, rejecting invalid quantities. */
  private computeNextStock(
    currentStock: number,
    kind: StockMovementKind,
    quantity: number,
  ): number {
    switch (kind) {
      case StockMovementKind.IN: {
        if (quantity <= 0) {
          throw new BadRequestException('La cantidad de una entrada debe ser mayor que cero');
        }
        return currentStock + quantity;
      }
      case StockMovementKind.OUT: {
        if (quantity <= 0) {
          throw new BadRequestException('La cantidad de una salida debe ser mayor que cero');
        }
        const next = currentStock - quantity;
        if (next < 0) {
          throw new BadRequestException('Stock insuficiente para la salida solicitada');
        }
        return next;
      }
      case StockMovementKind.ADJUST:
        return quantity;
      default: {
        // Exhaustiveness guard: every StockMovementKind is handled above.
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }

  private async assertSkuAvailable(
    tenantId: string,
    sku: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { tenantId, sku },
      select: { id: true },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ya existe un producto con ese SKU en este salón');
    }
  }

  private async assertSupplierExists(tenantId: string, supplierId: string): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException('El proveedor indicado no existe en este salón');
    }
  }

  private async assertBookingExists(tenantId: string, bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: { id: true },
    });
    if (!booking) {
      throw new BadRequestException('La reserva indicada no existe en este salón');
    }
  }
}
