'use client';

/**
 * Capa de datos del dominio Tienda online (SPEC §7): pedidos (listado, detalle,
 * cambio de estado) y el catálogo de productos de tienda (`Product` con
 * `isStoreItem: true`, reutilizando el CRUD de Inventario).
 *
 * Rutas reales (ver apps/api/src/modules/store/store.controller.ts, bajo
 * /api/v1 vía BFF /api/proxy):
 *  - GET            /store/products   (catálogo público — no se usa aquí)
 *  - GET             /store/orders
 *  - GET             /store/orders/:id
 *  - PATCH           /store/orders/:id/status
 *  - GET/POST/PATCH/DELETE /products   (gestión, ver lib/hooks/inventory.ts)
 */
import type { PaginatedResult, SortOrder } from '@fgd/types';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  useApiMutation,
  useApiQuery,
  type UseApiMutationOptions,
} from './use-api';
import type { ApiClientError } from '../api';
import {
  inventoryKeys,
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
  type ProductsQuery,
} from './inventory';

// -----------------------------------------------------------------------------
// Tipos de dominio (mirror de los modelos Prisma expuestos por la API)
// -----------------------------------------------------------------------------

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

/** Transiciones de estado permitidas (mirror de store.service.ts — solo UX; la API es la autoridad). */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export interface OrderItemProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: OrderItemProduct;
}

export interface OrderClient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface Order {
  id: string;
  tenantId: string;
  clientId: string | null;
  paymentId: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  status: OrderStatus;
  shippingAddress: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  client: OrderClient | null;
}

// -----------------------------------------------------------------------------
// Queries: parámetros
// -----------------------------------------------------------------------------

export interface OrdersQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  status?: OrderStatus;
}

// -----------------------------------------------------------------------------
// Payloads de escritura
// -----------------------------------------------------------------------------

export interface UpdateOrderStatusInput {
  id: string;
  status: OrderStatus;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const storeKeys = {
  orders: (query?: OrdersQuery) => ['store', 'orders', query ?? {}] as const,
  order: (id: string) => ['store', 'orders', id] as const,
};

// -----------------------------------------------------------------------------
// Pedidos
// -----------------------------------------------------------------------------

export function useOrders(query: OrdersQuery = {}): UseQueryResult<PaginatedResult<Order>, ApiClientError> {
  return useApiQuery<PaginatedResult<Order>>(storeKeys.orders(query), 'store/orders', {
    query: query as Record<string, string | number | boolean | undefined>,
  });
}

export function useOrder(id: string | undefined): UseQueryResult<Order, ApiClientError> {
  return useApiQuery<Order>(storeKeys.order(id ?? ''), `store/orders/${id}`, {
    enabled: Boolean(id),
  });
}

export function useUpdateOrderStatus(
  options: UseApiMutationOptions<Order, UpdateOrderStatusInput> = {},
) {
  return useApiMutation<Order, UpdateOrderStatusInput>('store/orders', 'PATCH', {
    resolvePath: (vars) => `store/orders/${vars.id}/status`,
    invalidateKeys: (_data, vars) => [storeKeys.orders(), storeKeys.order(vars.id)],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Productos de tienda (Product con isStoreItem: true) — reutiliza el CRUD de
// Inventario; aquí solo fijamos el filtro `isStoreItem` por defecto.
// -----------------------------------------------------------------------------

export type { Product };
export { inventoryKeys, useCreateProduct, useUpdateProduct, useDeleteProduct };

export function useStoreProducts(
  query: Omit<ProductsQuery, 'isStoreItem'> = {},
): UseQueryResult<PaginatedResult<Product>, ApiClientError> {
  return useProducts({ ...query, isStoreItem: true });
}

/**
 * Catálogo PÚBLICO de la tienda (`GET /store/products`, marcado `@Public`).
 *
 * `useStoreProducts` no vale fuera del panel: va contra `/products`, que exige
 * OWNER/MANAGER/EMPLOYEE, así que a una alumna le devolvería 403. Este es el
 * que usa el aula para los kits.
 */
export function usePublicStoreProducts(): UseQueryResult<
  PaginatedResult<Product>,
  ApiClientError
> {
  return useApiQuery<PaginatedResult<Product>>(
    ['store', 'products', 'public'],
    'store/products',
  );
}
