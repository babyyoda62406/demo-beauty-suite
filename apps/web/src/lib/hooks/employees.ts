'use client';

/**
 * Capa de datos de Empleadas/Profesionales (SPEC §6/§7).
 *
 * Rutas de la API Nest bajo `/api/v1` (ver `employees.controller.ts`):
 *   GET    /employees                         → listado paginado + filtros
 *   GET    /employees/:id                     → ficha
 *   POST   /employees                          → alta
 *   PATCH  /employees/:id                      → edición
 *   DELETE /employees/:id                      → baja
 *   GET    /employees/:id/schedule             → horario semanal
 *   POST   /employees/:id/schedule             → añade tramo
 *   PATCH  /employees/:id/schedule/:whId       → edita tramo
 *   DELETE /employees/:id/schedule/:whId       → elimina tramo
 *   GET    /employees/:id/time-off             → ausencias
 *   POST   /employees/:id/time-off             → crea ausencia
 *   PATCH  /employees/:id/time-off/:toId       → edita/aprueba/rechaza ausencia
 *   DELETE /employees/:id/time-off/:toId       → elimina ausencia
 *   GET    /employees/:id/commissions          → comisiones (opcional period/status)
 *   POST   /employees/:id/commissions/calculate → (re)calcula comisiones del periodo
 *   GET    /employees/:id/performance          → nº de citas e ingresos
 *
 * Todas las llamadas del navegador pasan por el proxy BFF (`apiRequest`).
 */
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { PaginatedResult, PaginationQuery } from '@fgd/types';
import { apiClient, ApiClientError, useApiQuery } from './use-api';

// -----------------------------------------------------------------------------
// Tipos (contrato JSON: las fechas viajan como strings ISO-8601)
// -----------------------------------------------------------------------------

/** Profesional del salón (tal y como lo serializa la API). Dinero en céntimos. */
export interface Employee {
  id: string;
  tenantId: string;
  userId: string | null;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  color: string;
  /** Puntos básicos (1500 = 15 %). */
  commissionRate: number | null;
  /** Céntimos/mes. */
  salary: number | null;
  hireDate: string | null;
  active: boolean;
  bookable: boolean;
  bio: string | null;
  specialties: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Tramo de horario semanal. `weekday`: 0=domingo … 6=sábado. */
export interface WorkingHours {
  id: string;
  tenantId: string;
  employeeId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export type TimeOffKind = 'VACATION' | 'SICK' | 'PERSONAL' | 'OTHER';
export type TimeOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Ausencia/permiso del profesional. */
export interface TimeOff {
  id: string;
  tenantId: string;
  employeeId: string;
  startAt: string;
  endAt: string;
  kind: TimeOffKind;
  status: TimeOffStatus;
  createdAt: string;
  updatedAt: string;
}

export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID';

/** Comisión generada a partir de una cita COMPLETED. */
export interface Commission {
  id: string;
  tenantId: string;
  employeeId: string;
  bookingId: string | null;
  orderId: string | null;
  amount: number;
  currency: string;
  period: string;
  status: CommissionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Resultado de (re)calcular comisiones de un periodo. */
export interface CommissionCalculationResult {
  period: string;
  created: number;
  skipped: number;
  totalAmount: number;
  commissions: Commission[];
}

/** Rendimiento del profesional en una ventana temporal. */
export interface EmployeePerformance {
  employeeId: string;
  from: string;
  to: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  revenue: number;
  currency: string;
}

/** Payload de alta/edición de profesional (campos opcionales se omiten). */
export interface EmployeeInput {
  name: string;
  title?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  photoUrl?: string | undefined;
  color?: string | undefined;
  commissionRate?: number | undefined;
  salary?: number | undefined;
  hireDate?: string | undefined;
  active?: boolean | undefined;
  bookable?: boolean | undefined;
  bio?: string | undefined;
  specialties?: string | undefined;
}

/** Filtros del listado admin de profesionales. */
export interface EmployeesQuery extends PaginationQuery {
  active?: boolean;
  bookable?: boolean;
}

// -----------------------------------------------------------------------------
// Claves de caché
// -----------------------------------------------------------------------------

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (params: EmployeesQuery) => [...employeeKeys.lists(), params] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  schedule: (id: string) => [...employeeKeys.detail(id), 'schedule'] as const,
  timeOff: (id: string) => [...employeeKeys.detail(id), 'time-off'] as const,
  commissions: (id: string, period?: string, status?: CommissionStatus) =>
    [...employeeKeys.detail(id), 'commissions', period ?? null, status ?? null] as const,
  performance: (id: string, from?: string, to?: string) =>
    [...employeeKeys.detail(id), 'performance', from ?? null, to ?? null] as const,
};

// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/** Listado paginado de profesionales con filtros y búsqueda. */
export function useEmployees(params: EmployeesQuery = {}) {
  const query: Record<string, string | number | boolean> = {};
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  if (params.search) query.search = params.search;
  if (params.active !== undefined) query.active = params.active;
  if (params.bookable !== undefined) query.bookable = params.bookable;

  return useApiQuery<PaginatedResult<Employee>>(employeeKeys.list(params), 'employees', {
    query,
    placeholderData: keepPreviousData,
  });
}

/** Ficha de un profesional. */
export function useEmployee(id: string, enabled = true) {
  return useApiQuery<Employee>(employeeKeys.detail(id), `employees/${id}`, {
    enabled: enabled && Boolean(id),
  });
}

/** Horario semanal del profesional. */
export function useEmployeeSchedule(employeeId: string, enabled = true) {
  return useApiQuery<WorkingHours[]>(employeeKeys.schedule(employeeId), `employees/${employeeId}/schedule`, {
    enabled: enabled && Boolean(employeeId),
  });
}

/** Ausencias/permisos del profesional. */
export function useEmployeeTimeOff(employeeId: string, enabled = true) {
  return useApiQuery<TimeOff[]>(employeeKeys.timeOff(employeeId), `employees/${employeeId}/time-off`, {
    enabled: enabled && Boolean(employeeId),
  });
}

/** Comisiones del profesional, opcionalmente filtradas por periodo (`YYYY-MM`) y estado. */
export function useEmployeeCommissions(
  employeeId: string,
  params: { period?: string; status?: CommissionStatus } = {},
  enabled = true,
) {
  const query: Record<string, string> = {};
  if (params.period) query.period = params.period;
  if (params.status) query.status = params.status;

  return useApiQuery<Commission[]>(
    employeeKeys.commissions(employeeId, params.period, params.status),
    `employees/${employeeId}/commissions`,
    { query, enabled: enabled && Boolean(employeeId) },
  );
}

/** Rendimiento del profesional (nº citas e ingresos) en una ventana ISO-8601. */
export function useEmployeePerformance(
  employeeId: string,
  params: { from?: string; to?: string } = {},
  enabled = true,
) {
  const query: Record<string, string> = {};
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  return useApiQuery<EmployeePerformance>(
    employeeKeys.performance(employeeId, params.from, params.to),
    `employees/${employeeId}/performance`,
    { query, enabled: enabled && Boolean(employeeId) },
  );
}

// -----------------------------------------------------------------------------
// Escrituras
//
// La API usa `forbidNonWhitelisted: true`, por lo que los cuerpos deben
// contener EXACTAMENTE los campos del DTO. Por eso estas mutaciones construyen
// el cuerpo a mano (no reenvían las variables completas) e invalidan la caché
// de forma explícita.
// -----------------------------------------------------------------------------

/** Alta de profesional. Invalida el listado. */
export function useCreateEmployee(): UseMutationResult<Employee, ApiClientError, EmployeeInput> {
  const qc = useQueryClient();
  return useMutation<Employee, ApiClientError, EmployeeInput>({
    mutationFn: (input) => apiClient.post<Employee>('employees', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.lists() }),
  });
}

/** Variables para editar un profesional: id + parcial de datos. */
export interface UpdateEmployeeVars {
  id: string;
  data: Partial<EmployeeInput>;
}

/** Edición de profesional. Invalida el listado y su ficha. */
export function useUpdateEmployee(): UseMutationResult<Employee, ApiClientError, UpdateEmployeeVars> {
  const qc = useQueryClient();
  return useMutation<Employee, ApiClientError, UpdateEmployeeVars>({
    mutationFn: ({ id, data }) => apiClient.patch<Employee>(`employees/${id}`, data),
    onSuccess: (_data, { id }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: employeeKeys.lists() }),
        qc.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
      ]),
  });
}

/** Baja de profesional. Invalida el listado. */
export function useDeleteEmployee(): UseMutationResult<void, ApiClientError, string> {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => apiClient.delete<void>(`employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.lists() }),
  });
}

// --- Horarios (WorkingHours) -------------------------------------------------

export interface WorkingHoursInput {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface AddScheduleVars {
  employeeId: string;
  data: WorkingHoursInput;
}

/** Añade un tramo de horario. Invalida el horario del profesional. */
export function useAddEmployeeSchedule(): UseMutationResult<WorkingHours, ApiClientError, AddScheduleVars> {
  const qc = useQueryClient();
  return useMutation<WorkingHours, ApiClientError, AddScheduleVars>({
    mutationFn: ({ employeeId, data }) => apiClient.post<WorkingHours>(`employees/${employeeId}/schedule`, data),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: employeeKeys.schedule(employeeId) }),
  });
}

export interface UpdateScheduleVars {
  employeeId: string;
  workingHoursId: string;
  data: Partial<WorkingHoursInput>;
}

/** Edita un tramo de horario. Invalida el horario del profesional. */
export function useUpdateEmployeeSchedule(): UseMutationResult<WorkingHours, ApiClientError, UpdateScheduleVars> {
  const qc = useQueryClient();
  return useMutation<WorkingHours, ApiClientError, UpdateScheduleVars>({
    mutationFn: ({ employeeId, workingHoursId, data }) =>
      apiClient.patch<WorkingHours>(`employees/${employeeId}/schedule/${workingHoursId}`, data),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: employeeKeys.schedule(employeeId) }),
  });
}

export interface RemoveScheduleVars {
  employeeId: string;
  workingHoursId: string;
}

/** Elimina un tramo de horario. Invalida el horario del profesional. */
export function useRemoveEmployeeSchedule(): UseMutationResult<void, ApiClientError, RemoveScheduleVars> {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, RemoveScheduleVars>({
    mutationFn: ({ employeeId, workingHoursId }) =>
      apiClient.delete<void>(`employees/${employeeId}/schedule/${workingHoursId}`),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: employeeKeys.schedule(employeeId) }),
  });
}

// --- Ausencias (TimeOff) -----------------------------------------------------

export interface TimeOffInput {
  startAt: string;
  endAt: string;
  kind?: TimeOffKind | undefined;
  status?: TimeOffStatus | undefined;
}

export interface AddTimeOffVars {
  employeeId: string;
  data: TimeOffInput;
}

/** Crea una ausencia. Invalida las ausencias del profesional. */
export function useAddEmployeeTimeOff(): UseMutationResult<TimeOff, ApiClientError, AddTimeOffVars> {
  const qc = useQueryClient();
  return useMutation<TimeOff, ApiClientError, AddTimeOffVars>({
    mutationFn: ({ employeeId, data }) => apiClient.post<TimeOff>(`employees/${employeeId}/time-off`, data),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: employeeKeys.timeOff(employeeId) }),
  });
}

export interface UpdateTimeOffVars {
  employeeId: string;
  timeOffId: string;
  data: Partial<TimeOffInput>;
}

/** Edita/aprueba/rechaza una ausencia. Invalida las ausencias del profesional. */
export function useUpdateEmployeeTimeOff(): UseMutationResult<TimeOff, ApiClientError, UpdateTimeOffVars> {
  const qc = useQueryClient();
  return useMutation<TimeOff, ApiClientError, UpdateTimeOffVars>({
    mutationFn: ({ employeeId, timeOffId, data }) =>
      apiClient.patch<TimeOff>(`employees/${employeeId}/time-off/${timeOffId}`, data),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: employeeKeys.timeOff(employeeId) }),
  });
}

export interface RemoveTimeOffVars {
  employeeId: string;
  timeOffId: string;
}

/** Elimina una ausencia. Invalida las ausencias del profesional. */
export function useRemoveEmployeeTimeOff(): UseMutationResult<void, ApiClientError, RemoveTimeOffVars> {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, RemoveTimeOffVars>({
    mutationFn: ({ employeeId, timeOffId }) =>
      apiClient.delete<void>(`employees/${employeeId}/time-off/${timeOffId}`),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: employeeKeys.timeOff(employeeId) }),
  });
}

// --- Comisiones ---------------------------------------------------------------

export interface CalculateCommissionsVars {
  employeeId: string;
  period: string;
}

/** (Re)calcula las comisiones del periodo a partir de citas COMPLETED (idempotente). */
export function useCalculateCommissions(): UseMutationResult<
  CommissionCalculationResult,
  ApiClientError,
  CalculateCommissionsVars
> {
  const qc = useQueryClient();
  return useMutation<CommissionCalculationResult, ApiClientError, CalculateCommissionsVars>({
    mutationFn: ({ employeeId, period }) =>
      apiClient.post<CommissionCalculationResult>(`employees/${employeeId}/commissions/calculate`, { period }),
    onSuccess: (_data, { employeeId }) =>
      qc.invalidateQueries({ queryKey: [...employeeKeys.detail(employeeId), 'commissions'] }),
  });
}
