'use client';

/**
 * Capa de datos genérica sobre `lib/api.ts` + TanStack Query.
 *
 * Convención BFF (SPEC §9): el navegador llama a `/api/proxy/<path>` y el route
 * handler lo reenvía a la API Nest en `/api/v1/<path>` con la cookie de sesión.
 * Aquí exponemos:
 *   - `apiRequest(path, opts)`  → fetch tipado que añade el prefijo del proxy.
 *   - `useApiQuery(key, path)`  → fábrica de lecturas cacheadas.
 *   - `useApiMutation(path)`    → fábrica de escrituras con invalidación.
 *   - helpers de invalidación de caché.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiFetch, ApiClientError, type ApiRequestOptions } from '../api';

/** Prefijo del proxy BFF. Todas las llamadas del navegador pasan por aquí. */
export const PROXY_PREFIX = '/api/proxy';

/** Re-export para que las features tipen errores sin importar de dos sitios. */
export { ApiClientError };
export type { ApiRequestOptions };

/** Normaliza un path de API (`/clients` o `clients`) a la ruta del proxy. */
export function proxyPath(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${PROXY_PREFIX}${clean}`;
}

/**
 * Fetch tipado contra el BFF. Igual que `apiFetch` pero anteponiendo el prefijo
 * del proxy y lanzando siempre `ApiClientError` en caso de fallo.
 *
 * @param path Ruta bajo `/api/v1` (sin el prefijo), p.ej. `"clients"`.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  return apiFetch<TResponse>(proxyPath(path), options);
}

/** Helpers por verbo, ya apuntando al proxy. */
export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', json }),
  patch: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', json }),
  put: <T>(path: string, json?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', json }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export interface UseApiQueryOptions<TData>
  extends Omit<
    UseQueryOptions<TData, ApiClientError, TData, QueryKey>,
    'queryKey' | 'queryFn'
  > {
  /** Query params serializados en la URL. */
  query?: ApiRequestOptions['query'];
  /** Extra fetch options (headers, signal ya lo inyecta la query). */
  request?: Omit<ApiRequestOptions, 'query' | 'method'>;
}

/**
 * Lectura cacheada de un recurso GET del BFF.
 *
 * @param key  Clave de caché de TanStack Query (array estable).
 * @param path Ruta de API bajo `/api/v1` (sin prefijo de proxy).
 */
export function useApiQuery<TData>(
  key: QueryKey,
  path: string,
  options: UseApiQueryOptions<TData> = {},
): UseQueryResult<TData, ApiClientError> {
  const { query, request, ...queryOptions } = options;
  return useQuery<TData, ApiClientError, TData, QueryKey>({
    queryKey: key,
    queryFn: ({ signal }) =>
      apiRequest<TData>(path, {
        ...request,
        method: 'GET',
        signal,
        ...(query ? { query } : {}),
      }),
    ...queryOptions,
  });
}

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export type ApiMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface UseApiMutationOptions<TData, TVariables>
  extends Omit<
    UseMutationOptions<TData, ApiClientError, TVariables>,
    'mutationFn'
  > {
  /**
   * Claves a invalidar tras el éxito. Puede ser un array de claves o una
   * función que las deriva a partir de las variables y la respuesta.
   */
  invalidateKeys?:
    | QueryKey[]
    | ((data: TData, variables: TVariables) => QueryKey[]);
  /** Resuelve la ruta dinámicamente a partir de las variables (p.ej. `/clients/${id}`). */
  resolvePath?: (variables: TVariables) => string;
  /**
   * Cuerpo que se envía, cuando NO coincide con las variables completas.
   *
   * Rara vez hace falta: por defecto se descartan solos los campos que solo
   * sirvieron para construir la ruta (ver `stripPathParams`). Úsalo cuando el
   * cuerpo no se deduzca de las variables (renombrar campos, envolverlos…).
   */
  resolveBody?: (variables: TVariables) => unknown;
  /**
   * Variables que son contexto y no payload: no viajan en la ruta, pero
   * tampoco las admite el DTO. El caso típico es un `courseId` que solo sirve
   * para saber qué caché invalidar; si se cuela en el cuerpo, la API responde
   * 400 «property courseId should not exist».
   */
  omitFromBody?: ReadonlyArray<string>;
}

/**
 * Quita del cuerpo los campos que ya viajan en la URL.
 *
 * Los DTO de la API validan con `whitelist` + `forbidNonWhitelisted`, así que
 * un `id` de más en el cuerpo devuelve 400 «property id should not exist» y la
 * operación falla entera. Como `resolvePath` inyecta esos campos en la ruta,
 * aquí se detectan comparando la ruta resuelta con la plantilla: los segmentos
 * que aparecen en la primera y no en la segunda son valores inyectados, y la
 * clave que los aportó se cae del cuerpo.
 *
 * Se hace por defecto —y no caso por caso— porque olvidarlo no se nota hasta
 * que alguien pulsa Guardar en producción.
 */
function stripPathParams<TVariables>(
  variables: TVariables,
  resolvedPath: string,
  templatePath: string,
  omit: ReadonlyArray<string> = [],
): unknown {
  if (resolvedPath === templatePath && omit.length === 0) return variables;
  if (variables === null || typeof variables !== 'object' || Array.isArray(variables)) {
    return variables;
  }

  const segmentsOf = (p: string): string[] => p.split('?')[0]?.split('/').filter(Boolean) ?? [];
  const template = new Set(segmentsOf(templatePath));
  const injected = new Set(segmentsOf(resolvedPath).filter((s) => !template.has(s)));
  if (injected.size === 0 && omit.length === 0) return variables;

  const omitted = new Set(omit);
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(variables as Record<string, unknown>)) {
    if (omitted.has(key)) continue;
    // Solo se descartan cadenas/números que coincidan con un segmento de la
    // ruta: un campo de texto normal nunca es un segmento de la URL.
    if ((typeof value === 'string' || typeof value === 'number') && injected.has(String(value))) {
      continue;
    }
    body[key] = value;
  }
  return body;
}

/**
 * Escritura (POST/PATCH/PUT/DELETE) contra el BFF, con invalidación de caché.
 *
 * @param path   Ruta de API bajo `/api/v1`. Si es dinámica, pasa `resolvePath`.
 * @param method Verbo HTTP (por defecto `POST`).
 *
 * @example
 * const create = useApiMutation<Client, CreateClientDto>('clients', 'POST', {
 *   invalidateKeys: [['clients']],
 * });
 * create.mutate(dto);
 */
export function useApiMutation<TData = unknown, TVariables = void>(
  path: string,
  method: ApiMethod = 'POST',
  options: UseApiMutationOptions<TData, TVariables> = {},
): UseMutationResult<TData, ApiClientError, TVariables> {
  const queryClient = useQueryClient();
  const { invalidateKeys, resolvePath, resolveBody, omitFromBody, onSuccess, ...mutationOptions } =
    options;

  return useMutation<TData, ApiClientError, TVariables>({
    mutationFn: (variables: TVariables) => {
      const resolved = resolvePath ? resolvePath(variables) : path;
      const hasBody = method !== 'DELETE';
      const json = resolveBody
        ? resolveBody(variables)
        : stripPathParams(variables, resolved, path, omitFromBody);
      return apiRequest<TData>(resolved, {
        method,
        ...(hasBody ? { json } : {}),
      });
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (invalidateKeys) {
        const keys =
          typeof invalidateKeys === 'function'
            ? invalidateKeys(data, variables)
            : invalidateKeys;
        await Promise.all(
          keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      }
      await onSuccess?.(data, variables, onMutateResult, context);
    },
    ...mutationOptions,
  });
}

// -----------------------------------------------------------------------------
// Invalidación manual
// -----------------------------------------------------------------------------

/**
 * Hook helper para invalidar caché imperativamente desde componentes
 * (p.ej. tras una acción que no pasa por `useApiMutation`).
 */
export function useInvalidate(): (keys: QueryKey | QueryKey[]) => Promise<void> {
  const queryClient = useQueryClient();
  return async (keys) => {
    const list = Array.isArray(keys[0]) ? (keys as QueryKey[]) : [keys as QueryKey];
    await Promise.all(
      list.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  };
}

// -----------------------------------------------------------------------------
// Sesión
// -----------------------------------------------------------------------------

/** Cuenta con la sesión abierta. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT' | 'STUDENT';
  phone: string | null;
  photoUrl: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  photoUrl?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Quién ha iniciado sesión (`GET auth/profile`).
 *
 * La cookie es httpOnly, así que el navegador no puede mirar el token: hay que
 * preguntárselo a la API. Sin esto la cabecera mostraba unas iniciales fijas a
 * todo el mundo, incluidas alumnas y clientas.
 */
export function useCurrentUser(): UseQueryResult<CurrentUser, ApiClientError> {
  return useApiQuery<CurrentUser>(['auth', 'profile'], 'auth/profile', {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Edita la propia cuenta (nombre, teléfono, foto). */
export function useUpdateProfile() {
  return useApiMutation<CurrentUser, UpdateProfileInput>('auth/profile', 'PATCH', {
    invalidateKeys: [['auth', 'profile']],
  });
}

/** Cambia la contraseña propia; exige la actual. */
export function useChangePassword() {
  return useApiMutation<{ success: true }, ChangePasswordInput>('auth/change-password', 'POST');
}
