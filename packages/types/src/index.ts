/**
 * FGD Beauty Suite — shared types and enums (API ↔ web contract).
 *
 * Kept intentionally minimal and framework-agnostic. Enums are declared as
 * `const` object + union type so they are usable in both Prisma-adjacent
 * backend code and the browser bundle without emitting runtime enum helpers.
 */

// -----------------------------------------------------------------------------
// Roles (RBAC — SPEC §4)
// -----------------------------------------------------------------------------

export const Role = {
  SUPERADMIN: 'SUPERADMIN',
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  CLIENT: 'CLIENT',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// -----------------------------------------------------------------------------
// Plans (SPEC §6 — Plan.key)
// -----------------------------------------------------------------------------

export const PlanKey = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
} as const;

export type PlanKey = (typeof PlanKey)[keyof typeof PlanKey];

// -----------------------------------------------------------------------------
// Bookings (SPEC §6 — Booking.status)
// -----------------------------------------------------------------------------

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

/** Origin of a booking (SPEC §6 — Booking.source). */
export const BookingSource = {
  PUBLIC: 'PUBLIC',
  PORTAL: 'PORTAL',
  ADMIN: 'ADMIN',
} as const;

export type BookingSource = (typeof BookingSource)[keyof typeof BookingSource];

// -----------------------------------------------------------------------------
// Payments (SPEC §6 — Payment.method)
// -----------------------------------------------------------------------------

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  STRIPE: 'STRIPE',
  GIFTCARD: 'GIFTCARD',
  VOUCHER: 'VOUCHER',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// -----------------------------------------------------------------------------
// API error envelope (SPEC §5 — uniform exception filter)
// -----------------------------------------------------------------------------

/**
 * Uniform error shape returned by the API's global exception filter.
 * Mirrors `{ statusCode, message, error, correlationId }` from SPEC §5.
 */
export interface ApiError {
  statusCode: number;
  /** Human-readable message(s); array when multiple validation errors apply. */
  message: string | string[];
  /** Short error code / class name, e.g. "Bad Request". */
  error: string;
  /** Correlation id to trace the request across logs. */
  correlationId: string;
  /** Optional path of the failing request. */
  path?: string;
  /** ISO-8601 timestamp of the failure. */
  timestamp?: string;
}

// -----------------------------------------------------------------------------
// Pagination (SPEC §7 — common paginated DTO)
// -----------------------------------------------------------------------------

export type SortOrder = 'asc' | 'desc';

/** Query parameters for a paginated list endpoint. */
export interface PaginationQuery {
  /** 1-based page number. */
  page?: number;
  /** Items per page. */
  pageSize?: number;
  /** Field to sort by. */
  sortBy?: string;
  /** Sort direction. */
  sortOrder?: SortOrder;
  /** Free-text search term. */
  search?: string;
}

/** Metadata describing a page within a paginated result set. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Envelope for a page of results of type `T`. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
