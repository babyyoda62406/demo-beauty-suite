'use client';

/**
 * Capa de datos del Super Admin de plataforma (SPEC §7 `superadmin` + §6
 * `plans-billing`). Sobre `useApiQuery`/`useApiMutation` (lib/hooks/use-api.ts),
 * que hablan con el BFF (`/api/proxy/<path>` → `/api/v1/<path>`).
 *
 * Rutas EXACTAS verificadas en:
 *   - apps/api/src/modules/superadmin/superadmin.controller.ts  (`/admin/*`)
 *   - apps/api/src/modules/plans-billing/plans.controller.ts    (`/plans`)
 *   - apps/api/src/modules/tenants/tenants.controller.ts        (`/tenants`)
 *
 * Todos los importes llegan en céntimos (Int) → formatéalos con lib/format.ts.
 */
import type { PaginatedResult } from '@fgd/types';
import { apiClient, useApiMutation, useApiQuery } from './use-api';

// -----------------------------------------------------------------------------
// Enums de dominio (espejo de los enums Prisma)
// -----------------------------------------------------------------------------

export type TenantStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';
export type PlanKey = 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'INCOMPLETE';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const PLAN_KEYS: PlanKey[] = ['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'];
export const TENANT_STATUSES: TenantStatus[] = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'];
export const TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const TICKET_PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/** Etiquetas en español de los enums para selects y celdas. */
export const PLAN_LABELS: Record<PlanKey, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
};
export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  ACTIVE: 'Activo',
  TRIAL: 'Prueba',
  SUSPENDED: 'Suspendido',
  CANCELLED: 'Cancelado',
};
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: 'En prueba',
  ACTIVE: 'Activa',
  PAST_DUE: 'Impago',
  CANCELLED: 'Cancelada',
  INCOMPLETE: 'Incompleta',
};
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

// -----------------------------------------------------------------------------
// Tipos de dominio (forma tal cual la sirve la API; fechas ISO string, dinero cts)
// -----------------------------------------------------------------------------

/** Un salón enriquecido con métricas de uso ligeras. */
export interface TenantMetrics {
  id: string;
  slug: string;
  name: string;
  planKey: PlanKey | string;
  status: TenantStatus;
  currency: string;
  createdAt: string;
  metrics: {
    users: number;
    clients: number;
    bookings: number;
    activeSubscriptions: number;
  };
}

/** KPIs globales de la plataforma para el panel del Super Admin. */
export interface GlobalStats {
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  bookingsTotal: number;
  clientsTotal: number;
  openTickets: number;
  /** MRR aproximado, en céntimos, sobre suscripciones activas. */
  mrrCents: number;
  currency: string;
}

/** Token de soporte acotado a un salón (impersonación). */
export interface ImpersonationToken {
  accessToken: string;
  expiresIn: number;
  tenantId: string;
  role: string;
}

/** Incidencia de soporte de un salón. */
export interface SupportTicket {
  id: string;
  tenantId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Activación de un módulo de negocio para un salón. */
export interface ModuleActivation {
  id: string;
  tenantId: string;
  moduleKey: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Plan de plataforma (catálogo). Precio en céntimos. */
export interface Plan {
  key: PlanKey;
  name: string;
  priceMonthly: number;
  currency: string;
  features: Record<string, unknown>;
  moduleFlags: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Parámetros de consulta / payloads
// -----------------------------------------------------------------------------

export interface ListTenantsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: TenantStatus;
  planKey?: PlanKey;
}

export interface ListTicketsParams {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}

/** Alta de salón (POST /tenants). */
export interface CreateTenantInput {
  slug: string;
  name: string;
  legalName?: string;
  planKey?: PlanKey;
  status?: TenantStatus;
  currency?: string;
  email?: string;
  phone?: string;
}

/** Alta de incidencia (POST /admin/tickets). */
export interface CreateTicketInput {
  tenantId: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
}

/** Actualización de incidencia (PATCH /admin/tickets/:id). */
export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  subject?: string;
  description?: string;
}

/** Alta/edición de plan. `key` sólo se envía al crear. */
export interface PlanInput {
  key?: PlanKey;
  name: string;
  priceMonthly: number;
  currency?: string;
  features?: Record<string, unknown>;
  moduleFlags?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const superadminKeys = {
  tenants: (p: ListTenantsParams) => ['superadmin', 'tenants', p] as const,
  stats: () => ['superadmin', 'stats'] as const,
  tickets: (p: ListTicketsParams) => ['superadmin', 'tickets', p] as const,
  modules: (tenantId: string) => ['superadmin', 'modules', tenantId] as const,
  plans: () => ['superadmin', 'plans'] as const,
};

/** Elimina claves indefinidas de un objeto de query. */
function clean<T extends Record<string, unknown>>(obj: T): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Salones (tenants) con métricas
// -----------------------------------------------------------------------------

/** Listado paginado de salones con métricas de uso (SUPERADMIN). */
export function useTenants(params: ListTenantsParams = {}) {
  return useApiQuery<PaginatedResult<TenantMetrics>>(
    superadminKeys.tenants(params),
    'admin/tenants',
    { query: clean(params as Record<string, unknown>) },
  );
}

/** Alta de salón (POST /tenants). Invalida el listado y las estadísticas. */
export function useCreateTenant() {
  return useApiMutation<TenantMetrics, CreateTenantInput>('tenants', 'POST', {
    invalidateKeys: [
      ['superadmin', 'tenants'],
      ['superadmin', 'stats'],
    ],
  });
}

// -----------------------------------------------------------------------------
// Estadísticas globales
// -----------------------------------------------------------------------------

/** KPIs globales de la plataforma (salones, MRR aprox, citas, clientas). */
export function useGlobalStats() {
  return useApiQuery<GlobalStats>(superadminKeys.stats(), 'admin/stats');
}

// -----------------------------------------------------------------------------
// Impersonación (entrar como salón)
// -----------------------------------------------------------------------------

/**
 * Emite un token de soporte acotado a un salón (POST /admin/impersonate/:id).
 * No usamos `useApiMutation` porque la ruta es dinámica y el cuerpo va vacío.
 */
export function useImpersonate() {
  return useApiMutation<ImpersonationToken, { tenantId: string }>('admin/impersonate', 'POST', {
    resolvePath: (v) => `admin/impersonate/${v.tenantId}`,
  });
}

/** Variante imperativa por si se necesita fuera de un componente reactivo. */
export function impersonateTenant(tenantId: string): Promise<ImpersonationToken> {
  return apiClient.post<ImpersonationToken>(`admin/impersonate/${tenantId}`);
}

// -----------------------------------------------------------------------------
// Incidencias (tickets de soporte)
// -----------------------------------------------------------------------------

/** Listado paginado de incidencias de todos los salones. */
export function useTickets(params: ListTicketsParams = {}) {
  return useApiQuery<PaginatedResult<SupportTicket>>(
    superadminKeys.tickets(params),
    'admin/tickets',
    { query: clean(params as Record<string, unknown>) },
  );
}

/** Abre una incidencia para un salón (POST /admin/tickets). */
export function useCreateTicket() {
  return useApiMutation<SupportTicket, CreateTicketInput>('admin/tickets', 'POST', {
    invalidateKeys: [
      ['superadmin', 'tickets'],
      ['superadmin', 'stats'],
    ],
  });
}

/** Actualiza estado/prioridad/texto de una incidencia (PATCH /admin/tickets/:id). */
export function useUpdateTicket() {
  return useApiMutation<SupportTicket, { id: string; data: UpdateTicketInput }>(
    'admin/tickets',
    'PATCH',
    {
      resolvePath: (v) => `admin/tickets/${v.id}`,
      invalidateKeys: [
        ['superadmin', 'tickets'],
        ['superadmin', 'stats'],
      ],
    },
  );
}

/** Elimina una incidencia (DELETE /admin/tickets/:id). */
export function useDeleteTicket() {
  return useApiMutation<void, string>('admin/tickets', 'DELETE', {
    resolvePath: (id) => `admin/tickets/${id}`,
    invalidateKeys: [
      ['superadmin', 'tickets'],
      ['superadmin', 'stats'],
    ],
  });
}

// -----------------------------------------------------------------------------
// Módulos por salón
// -----------------------------------------------------------------------------

/** Módulos activados de un salón (GET /admin/tenants/:id/modules). */
export function useTenantModules(tenantId: string | undefined) {
  return useApiQuery<ModuleActivation[]>(
    superadminKeys.modules(tenantId ?? ''),
    `admin/tenants/${tenantId}/modules`,
    { enabled: Boolean(tenantId) },
  );
}

/** Activa/desactiva un módulo de un salón (PUT /admin/tenants/:id/modules). */
export function useSetTenantModule() {
  return useApiMutation<
    ModuleActivation,
    { tenantId: string; moduleKey: string; enabled: boolean }
  >('admin/tenants', 'PUT', {
    resolvePath: (v) => `admin/tenants/${v.tenantId}/modules`,
    invalidateKeys: (_data, v) => [superadminKeys.modules(v.tenantId)],
  });
}

// -----------------------------------------------------------------------------
// Planes (CRUD)
// -----------------------------------------------------------------------------

/** Catálogo de planes de la plataforma (GET /plans). */
export function usePlans() {
  return useApiQuery<Plan[]>(superadminKeys.plans(), 'plans');
}

/** Crea un plan (POST /plans). */
export function useCreatePlan() {
  return useApiMutation<Plan, PlanInput>('plans', 'POST', {
    invalidateKeys: [['superadmin', 'plans']],
  });
}

/** Actualiza un plan (PATCH /plans/:key). No se envía `key` en el cuerpo. */
export function useUpdatePlan() {
  return useApiMutation<Plan, { key: PlanKey; data: Omit<PlanInput, 'key'> }>(
    'plans',
    'PATCH',
    {
      resolvePath: (v) => `plans/${v.key}`,
      invalidateKeys: [['superadmin', 'plans']],
    },
  );
}

/** Elimina un plan (DELETE /plans/:key). */
export function useDeletePlan() {
  return useApiMutation<{ success: true }, PlanKey>('plans', 'DELETE', {
    resolvePath: (key) => `plans/${key}`,
    invalidateKeys: [['superadmin', 'plans']],
  });
}
