'use client';

/**
 * Capa de datos del dominio Ajustes/Salón (SPEC §3, §8). Autoservicio del OWNER
 * sobre su propio salón (`/tenants/me*`).
 *
 * Rutas reales (ver apps/api/src/modules/tenants/tenants.controller.ts, bajo
 * /api/v1 vía BFF /api/proxy):
 *  - GET   /tenants/me            → datos del salón (incluye `brand` Json).
 *  - PATCH /tenants/me/brand      → merge del branding (colors/logoUrl/fonts/socials).
 *  - GET   /tenants/me/settings   → lista de ajustes clave/valor del salón.
 *  - PATCH /tenants/me/settings   → upsert de un ajuste (key + valueJson).
 *
 * NOTA (limitación de API): el OWNER NO dispone de un endpoint para editar los
 * campos núcleo del `Tenant` (name/email/phone/timezone) — eso es SUPERADMIN
 * (`PATCH /tenants/:id`). Por eso los datos de contacto/horarios del negocio se
 * persisten como AJUSTES (`Setting`) bajo claves namespaced, y las redes
 * sociales en `brand.socials`. Así el OWNER es 100% autónomo con la API actual.
 */
import type { UseQueryResult } from '@tanstack/react-query';
import {
  useApiMutation,
  useApiQuery,
  type UseApiMutationOptions,
} from './use-api';
import type { ApiClientError } from '../api';

// -----------------------------------------------------------------------------
// Tipos de dominio (mirror de los modelos Prisma expuestos por la API)
// -----------------------------------------------------------------------------

/** Forma libre del branding almacenado en `Tenant.brand` (Json). */
export interface TenantBrand {
  colors?: Record<string, string>;
  logoUrl?: string;
  fonts?: Record<string, string>;
  socials?: Record<string, string>;
}

export type PlanKey = 'STARTER' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';
export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  brand: TenantBrand | null;
  domain: string | null;
  planKey: PlanKey;
  status: TenantStatus;
  timezone: string;
  locale: string;
  currency: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  tenantId: string;
  key: string;
  valueJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Claves de ajustes namespaced (persistencia de datos del negocio)
// -----------------------------------------------------------------------------

export const SETTING_KEYS = {
  /** Perfil de contacto del negocio (teléfono, email, dirección…). */
  businessProfile: 'business.profile',
  /** Horarios de apertura por día de la semana. */
  businessHours: 'business.hours',
  /** Mapa de módulos activados: `{ [moduleKey]: boolean }`. */
  modules: 'modules.activation',
} as const;

export interface BusinessProfile {
  displayName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  description?: string;
}

/** Horario de un día: si `closed`, ignora open/close. */
export interface DayHours {
  closed: boolean;
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

/** Lunes → Domingo. */
export type WeekHours = Record<string, DayHours>;

export type ModulesState = Record<string, boolean>;

// -----------------------------------------------------------------------------
// Payloads de escritura
// -----------------------------------------------------------------------------

/** Patch de branding (mirror de BrandDto). El merge del backend es a nivel raíz. */
export interface UpdateBrandInput {
  colors?: Record<string, string>;
  logoUrl?: string;
  fonts?: Record<string, string>;
  socials?: Record<string, string>;
}

/** Upsert de un ajuste (mirror de UpsertSettingDto). */
export interface UpsertSettingInput {
  key: string;
  valueJson: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const tenantKeys = {
  me: ['tenant', 'me'] as const,
  settings: ['tenant', 'settings'] as const,
};

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

/** Datos del salón del usuario autenticado. */
export function useTenant(): UseQueryResult<Tenant, ApiClientError> {
  return useApiQuery<Tenant>(tenantKeys.me, 'tenants/me');
}

/** Ajustes clave/valor del salón. */
export function useTenantSettings(): UseQueryResult<Setting[], ApiClientError> {
  return useApiQuery<Setting[]>(tenantKeys.settings, 'tenants/me/settings');
}

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

/** Actualiza (merge) el branding del propio salón. */
export function useUpdateBrand(
  options: UseApiMutationOptions<Tenant, UpdateBrandInput> = {},
) {
  return useApiMutation<Tenant, UpdateBrandInput>('tenants/me/brand', 'PATCH', {
    invalidateKeys: [tenantKeys.me],
    ...options,
  });
}

/** Crea o actualiza un ajuste del propio salón. */
export function useUpsertSetting(
  options: UseApiMutationOptions<Setting, UpsertSettingInput> = {},
) {
  return useApiMutation<Setting, UpsertSettingInput>('tenants/me/settings', 'PATCH', {
    invalidateKeys: [tenantKeys.settings],
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Selectores/utilidades (sin estado)
// -----------------------------------------------------------------------------

/** Extrae el `valueJson` de un ajuste por clave, o `undefined` si no existe. */
export function selectSetting<T = Record<string, unknown>>(
  settings: Setting[] | undefined,
  key: string,
): T | undefined {
  const found = settings?.find((s) => s.key === key);
  return found ? (found.valueJson as T) : undefined;
}
