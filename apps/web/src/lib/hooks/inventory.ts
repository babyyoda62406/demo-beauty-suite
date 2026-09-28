'use client';

/**
 * Capa de datos del dominio Inventario (SPEC): productos, proveedores,
 * movimientos de stock y el reporte de stock bajo.
 *
 * Rutas reales (ver apps/api/src/modules/inventory/*.controller.ts, bajo
 * /api/v1 vía BFF /api/proxy):
 *  - GET/POST            /products
 *  - GET/PATCH/DELETE    /products/:id
 *  - POST/GET            /products/:id/stock-movements
 *  - GET/POST            /suppliers
 *  - GET/PATCH/DELETE    /suppliers/:id
 *  - GET                 /inventory/low-stock
 */
import type { PaginatedResult, SortOrder } from '@fgd/types';
import {
  useApiMutation,
  useApiQuery,
  type UseApiMutationOptions,
} from './use-api';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ApiClientError } from '../api';

// -----------------------------------------------------------------------------
// Tipos de dominio (mirror de los modelos Prisma expuestos por la API)
// -----------------------------------------------------------------------------

export type StockMovementKind = 'IN' | 'OUT' | 'ADJUST';

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  cost: number | null;
  currency: string;
  stock: number;
  lowStockThreshold: number;
  supplierId: string | null;
  imageUrl: string | null;
  active: boolean;
  isStoreItem: boolean;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier | null;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  kind: StockMovementKind;
  quantity: number;
  reason: string | null;
  bookingId: string | null;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Queries: parámetros
// -----------------------------------------------------------------------------

export interface ProductsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  category?: string;
  supplierId?: string;
  active?: boolean;
  isStoreItem?: boolean;
}

export interface SuppliersQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
}

export interface LowStockQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
}

// -----------------------------------------------------------------------------
// Payloads de escritura (mirror de los DTO de apps/api)
// -----------------------------------------------------------------------------

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  cost?: number;
  currency?: string;
  stock?: number;
  lowStockThreshold?: number;
  supplierId?: string | null;
  imageUrl?: string;
  active?: boolean;
  isStoreItem?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface CreateSupplierInput {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export interface CreateStockMovementInput {
  kind: StockMovementKind;
  quantity: number;
  reason?: string;
  bookingId?: string | null;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const inventoryKeys = {
  products: (query?: ProductsQuery) => ['inventory', 'products', query ?? {}] as const,
  product: (id: string) => ['inventory', 'products', id] as const,
  stockMovements: (productId: string, query?: LowStockQuery) =>
    ['inventory', 'products', productId, 'stock-movements', query ?? {}] as const,
  suppliers: (query?: SuppliersQuery) => ['inventory', 'suppliers', query ?? {}] as const,
  supplier: (id: string) => ['inventory', 'suppliers', id] as const,
  lowStock: (query?: LowStockQuery) => ['inventory', 'low-stock', query ?? {}] as const,
};

// -----------------------------------------------------------------------------
// Productos
// -----------------------------------------------------------------------------

export function useProducts(query: ProductsQuery = {}): UseQueryResult<PaginatedResult<Product>, ApiClientError> {
  return useApiQuery<PaginatedResult<Product>>(inventoryKeys.products(query), 'products', {
    query: query as Record<string, string | number | boolean | undefined>,
  });
}

export function useProduct(id: string | undefined): UseQueryResult<Product, ApiClientError> {
  return useApiQuery<Product>(inventoryKeys.product(id ?? ''), `products/${id}`, {
    enabled: Boolean(id),
  });
}

export function useCreateProduct(
  options: UseApiMutationOptions<Product, CreateProductInput> = {},
) {
  return useApiMutation<Product, CreateProductInput>('products', 'POST', {
    invalidateKeys: () => [inventoryKeys.products(), inventoryKeys.lowStock()],
    ...options,
  });
}

export function useUpdateProduct(
  options: UseApiMutationOptions<Product, UpdateProductInput & { id: string }> = {},
) {
  return useApiMutation<Product, UpdateProductInput & { id: string }>('products', 'PATCH', {
    resolvePath: (vars) => `products/${vars.id}`,
    invalidateKeys: (_data, vars) => [
      inventoryKeys.products(),
      inventoryKeys.product(vars.id),
      inventoryKeys.lowStock(),
    ],
    ...options,
  });
}

export function useDeleteProduct(options: UseApiMutationOptions<void, { id: string }> = {}) {
  return useApiMutation<void, { id: string }>('products', 'DELETE', {
    resolvePath: (vars) => `products/${vars.id}`,
    invalidateKeys: () => [inventoryKeys.products(), inventoryKeys.lowStock()],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Movimientos de stock
// -----------------------------------------------------------------------------

export function useStockMovements(
  productId: string | undefined,
  query: LowStockQuery = {},
): UseQueryResult<PaginatedResult<StockMovement>, ApiClientError> {
  return useApiQuery<PaginatedResult<StockMovement>>(
    inventoryKeys.stockMovements(productId ?? '', query),
    `products/${productId}/stock-movements`,
    {
      enabled: Boolean(productId),
      query: query as Record<string, string | number | boolean | undefined>,
    },
  );
}

export function useCreateStockMovement(
  options: UseApiMutationOptions<StockMovement, CreateStockMovementInput & { productId: string }> = {},
) {
  return useApiMutation<StockMovement, CreateStockMovementInput & { productId: string }>(
    'products',
    'POST',
    {
      resolvePath: (vars) => `products/${vars.productId}/stock-movements`,
      invalidateKeys: (_data, vars) => [
        inventoryKeys.products(),
        inventoryKeys.product(vars.productId),
        inventoryKeys.stockMovements(vars.productId),
        inventoryKeys.lowStock(),
      ],
      ...options,
    },
  );
}

// -----------------------------------------------------------------------------
// Proveedores
// -----------------------------------------------------------------------------

export function useSuppliers(query: SuppliersQuery = {}): UseQueryResult<PaginatedResult<Supplier>, ApiClientError> {
  return useApiQuery<PaginatedResult<Supplier>>(inventoryKeys.suppliers(query), 'suppliers', {
    query: query as Record<string, string | number | boolean | undefined>,
  });
}

export function useSupplier(id: string | undefined): UseQueryResult<Supplier, ApiClientError> {
  return useApiQuery<Supplier>(inventoryKeys.supplier(id ?? ''), `suppliers/${id}`, {
    enabled: Boolean(id),
  });
}

export function useCreateSupplier(
  options: UseApiMutationOptions<Supplier, CreateSupplierInput> = {},
) {
  return useApiMutation<Supplier, CreateSupplierInput>('suppliers', 'POST', {
    invalidateKeys: () => [inventoryKeys.suppliers()],
    ...options,
  });
}

export function useUpdateSupplier(
  options: UseApiMutationOptions<Supplier, UpdateSupplierInput & { id: string }> = {},
) {
  return useApiMutation<Supplier, UpdateSupplierInput & { id: string }>('suppliers', 'PATCH', {
    resolvePath: (vars) => `suppliers/${vars.id}`,
    invalidateKeys: (_data, vars) => [inventoryKeys.suppliers(), inventoryKeys.supplier(vars.id), inventoryKeys.products()],
    ...options,
  });
}

export function useDeleteSupplier(options: UseApiMutationOptions<void, { id: string }> = {}) {
  return useApiMutation<void, { id: string }>('suppliers', 'DELETE', {
    resolvePath: (vars) => `suppliers/${vars.id}`,
    invalidateKeys: () => [inventoryKeys.suppliers(), inventoryKeys.products()],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Stock bajo
// -----------------------------------------------------------------------------

export function useLowStock(query: LowStockQuery = {}): UseQueryResult<PaginatedResult<Product>, ApiClientError> {
  return useApiQuery<PaginatedResult<Product>>(inventoryKeys.lowStock(query), 'inventory/low-stock', {
    query: query as Record<string, string | number | boolean | undefined>,
  });
}
