'use client';

/**
 * Capa de datos del dominio Caja (SPEC §6 `payments-cash`): cobros, gastos,
 * sesiones de caja y facturas. Sobre `useApiQuery`/`useApiMutation` (lib/hooks/use-api.ts),
 * que ya hablan con el BFF (`/api/proxy/<path>` → `/api/v1/<path>`).
 *
 * Rutas exactas verificadas en apps/api/src/modules/payments-cash/*.controller.ts.
 */
import type { PaginatedResult } from '@fgd/types';
import {
  useApiMutation,
  useApiQuery,
  useInvalidate,
  type UseApiMutationOptions,
} from './use-api';

// -----------------------------------------------------------------------------
// Tipos de dominio (forma tal cual la sirve la API; fechas llegan como ISO string)
// -----------------------------------------------------------------------------

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'STRIPE' | 'GIFTCARD' | 'VOUCHER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
export type CashSessionStatus = 'OPEN' | 'CLOSED';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  STRIPE: 'Stripe',
  GIFTCARD: 'Tarjeta regalo',
  VOUCHER: 'Bono',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
  CANCELLED: 'Cancelado',
};

export interface Payment {
  id: string;
  tenantId: string;
  clientId: string | null;
  bookingId: string | null;
  orderId: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  amount: number;
  currency?: string;
  method: PaymentMethod;
  status?: PaymentStatus;
  clientId?: string;
  bookingId?: string;
  orderId?: string;
}

export interface QueryPaymentsParams {
  page?: number;
  pageSize?: number;
  method?: PaymentMethod;
  status?: PaymentStatus;
  clientId?: string;
  bookingId?: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  supplierId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  currency?: string;
  description?: string;
  date?: string;
  supplierId?: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface QueryExpensesParams {
  page?: number;
  pageSize?: number;
  category?: string;
  from?: string;
  to?: string;
}

export interface CashSession {
  id: string;
  tenantId: string;
  openedById: string;
  openingFloat: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  currency: string;
  openedAt: string;
  closedAt: string | null;
  status: CashSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OpenCashSessionInput {
  openingFloat: number;
  currency?: string;
}

export interface CloseCashSessionInput {
  closingAmount: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  clientId: string | null;
  number: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  pdfUrl: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueryInvoicesParams {
  page?: number;
  pageSize?: number;
  status?: InvoiceStatus;
  clientId?: string;
}

export interface CashRegisterSummary {
  date: string;
  currency: string;
  income: {
    total: number;
    count: number;
    byMethod: Record<string, number>;
  };
  expenses: {
    total: number;
    count: number;
  };
  net: number;
}

/** Cliente mínimo para el selector del formulario de cobro. */
export interface ClientOption {
  id: string;
  name: string;
  phone: string;
}

/** Cita mínima para el selector del formulario de cobro. */
export interface BookingOption {
  id: string;
  clientId: string;
  startAt: string;
  status: string;
  price: number;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

const keys = {
  payments: (params: QueryPaymentsParams = {}) => ['cash', 'payments', params] as const,
  expenses: (params: QueryExpensesParams = {}) => ['cash', 'expenses', params] as const,
  invoices: (params: QueryInvoicesParams = {}) => ['cash', 'invoices', params] as const,
  cashSessionCurrent: () => ['cash', 'cash-sessions', 'current'] as const,
  cashSessionList: () => ['cash', 'cash-sessions', 'list'] as const,
  registerSummary: (date?: string) => ['cash', 'register-summary', date ?? 'today'] as const,
  clientsPicker: (search: string) => ['cash', 'clients-picker', search] as const,
  bookingsPicker: (date: string) => ['cash', 'bookings-picker', date] as const,
};

// -----------------------------------------------------------------------------
// Cobros (Payments)
// -----------------------------------------------------------------------------

export function usePayments(params: QueryPaymentsParams = {}) {
  return useApiQuery<PaginatedResult<Payment>>(keys.payments(params), 'payments', {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Pagos de la clienta autenticada, para su portal.
 *
 * `usePayments` va contra la ruta del salón, que exige staff: usarlo en el
 * portal devolvía 403 y la clienta no veía ni uno de sus pagos.
 */
export function useMyPayments(params: QueryPaymentsParams = {}) {
  return useApiQuery<PaginatedResult<Payment>>(
    ['cash', 'payments', 'me', params],
    'payments/me',
    { query: params as Record<string, string | number | boolean | undefined> },
  );
}

export function useCreatePayment(
  options: UseApiMutationOptions<Payment, CreatePaymentInput> = {},
) {
  return useApiMutation<Payment, CreatePaymentInput>('payments', 'POST', {
    invalidateKeys: [['cash', 'payments'], ['cash', 'register-summary'], ['cash', 'cash-sessions']],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Resumen de caja del día
// -----------------------------------------------------------------------------

export function useCashRegisterSummary(date?: string) {
  return useApiQuery<CashRegisterSummary>(
    keys.registerSummary(date),
    'cash-register/summary',
    { query: date ? { date } : {} },
  );
}

// -----------------------------------------------------------------------------
// Gastos (Expenses)
// -----------------------------------------------------------------------------

export function useExpenses(params: QueryExpensesParams = {}) {
  return useApiQuery<PaginatedResult<Expense>>(keys.expenses(params), 'expenses', {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

export function useCreateExpense(
  options: UseApiMutationOptions<Expense, CreateExpenseInput> = {},
) {
  return useApiMutation<Expense, CreateExpenseInput>('expenses', 'POST', {
    invalidateKeys: [['cash', 'expenses'], ['cash', 'register-summary']],
    ...options,
  });
}

export function useUpdateExpense(
  options: UseApiMutationOptions<Expense, { id: string } & UpdateExpenseInput> = {},
) {
  return useApiMutation<Expense, { id: string } & UpdateExpenseInput>('expenses', 'PATCH', {
    resolvePath: (vars) => `expenses/${vars.id}`,
    invalidateKeys: [['cash', 'expenses'], ['cash', 'register-summary']],
    ...options,
  });
}

export function useDeleteExpense(
  options: UseApiMutationOptions<void, { id: string }> = {},
) {
  return useApiMutation<void, { id: string }>('expenses', 'DELETE', {
    resolvePath: (vars) => `expenses/${vars.id}`,
    invalidateKeys: [['cash', 'expenses'], ['cash', 'register-summary']],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Cierre de caja (Cash sessions)
// -----------------------------------------------------------------------------

export function useCurrentCashSession() {
  return useApiQuery<CashSession | null>(keys.cashSessionCurrent(), 'cash-sessions/current');
}

export function useCashSessions() {
  return useApiQuery<CashSession[]>(keys.cashSessionList(), 'cash-sessions');
}

export function useOpenCashSession(
  options: UseApiMutationOptions<CashSession, OpenCashSessionInput> = {},
) {
  return useApiMutation<CashSession, OpenCashSessionInput>('cash-sessions/open', 'POST', {
    invalidateKeys: [['cash', 'cash-sessions']],
    ...options,
  });
}

export function useCloseCashSession(
  options: UseApiMutationOptions<CashSession, CloseCashSessionInput> = {},
) {
  return useApiMutation<CashSession, CloseCashSessionInput>('cash-sessions/close', 'POST', {
    invalidateKeys: [['cash', 'cash-sessions']],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Facturas / Tickets (Invoices)
// -----------------------------------------------------------------------------

export function useInvoices(params: QueryInvoicesParams = {}) {
  return useApiQuery<PaginatedResult<Invoice>>(keys.invoices(params), 'invoices', {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

/** Facturas de la clienta autenticada (mismo motivo que `useMyPayments`). */
export function useMyInvoices(params: QueryInvoicesParams = {}) {
  return useApiQuery<PaginatedResult<Invoice>>(
    ['cash', 'invoices', 'me', params],
    'invoices/me',
    { query: params as Record<string, string | number | boolean | undefined> },
  );
}

export function useIssueInvoice(
  options: UseApiMutationOptions<Invoice, { id: string }> = {},
) {
  return useApiMutation<Invoice, { id: string }>('invoices', 'POST', {
    resolvePath: (vars) => `invoices/${vars.id}/issue`,
    invalidateKeys: [['cash', 'invoices']],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Selectores auxiliares (clienta / cita) para el formulario de cobro
// -----------------------------------------------------------------------------

/** Clientas del salón para el selector de cobro (búsqueda opcional por nombre/teléfono). */
export function useClientOptions(search = '') {
  return useApiQuery<PaginatedResult<ClientOption>>(
    keys.clientsPicker(search),
    'clients',
    { query: { pageSize: 50, ...(search ? { search } : {}) } },
  );
}

/** Citas del día para asociar el cobro a una cita concreta. */
export function useTodayBookingOptions(isoDate: string) {
  const from = `${isoDate}T00:00:00.000Z`;
  const to = `${isoDate}T23:59:59.999Z`;
  return useApiQuery<PaginatedResult<BookingOption>>(
    keys.bookingsPicker(isoDate),
    'bookings',
    { query: { from, to, pageSize: 100 } },
  );
}

export { useInvalidate };
