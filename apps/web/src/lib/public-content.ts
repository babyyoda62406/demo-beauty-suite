import { API_PREFIX } from '@/lib/bff';
import { getApiBaseUrl } from '@/lib/env';

/**
 * Capa de datos SERVER-SIDE de la web pública (SPEC §9). Estos helpers corren
 * solo en Server Components: llaman a la API Nest directamente (no al proxy BFF
 * del navegador) y resuelven el salón con la cabecera `X-Tenant`, igual que
 * `blog.ts`. La API envuelve toda respuesta no paginada en `{ data }`
 * (TransformInterceptor), así que aquí desenvolvemos el sobre.
 *
 * Todos devuelven `null` ante error para que la página caiga con gracia al
 * contenido estático de `data.ts` (resiliencia — el sitio nunca se rompe).
 */

const TENANT_HEADER = 'x-tenant';
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? 'aurora';
/** Revalidación corta: el contenido del CMS se refresca en ~60 s. */
const REVALIDATE_SECONDS = 60;

/** Servicio público (activo) tal y como lo serializa la API. Dinero en céntimos. */
export interface PublicService {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  tagline: string | null;
  durationMin: number;
  price: number;
  currency: string;
  imageUrl: string | null;
}

/** Elemento de galería público. */
export interface PublicGalleryItem {
  id: string;
  url: string;
  category: string | null;
  isBeforeAfter: boolean;
  beforeUrl: string | null;
  afterUrl: string | null;
  caption: string | null;
}

/** Testimonio aprobado público. */
export interface PublicTestimonial {
  id: string;
  clientName: string;
  rating: number;
  text: string;
  avatarUrl: string | null;
}

function apiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

/** GET a la API con cabecera de tenant; desenvuelve `{ data }`. `null` si falla. */
async function fetchList<T>(path: string): Promise<T[] | null> {
  try {
    const response = await fetch(apiUrl(path), {
      headers: { [TENANT_HEADER]: DEFAULT_TENANT_SLUG },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    // Respuestas no paginadas llegan como `{ data: [...] }`.
    const data =
      payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data: unknown }).data
        : payload;
    return Array.isArray(data) ? (data as T[]) : null;
  } catch {
    return null;
  }
}

/** Servicios activos del salón (web pública). `null` si la API falla. */
export function getPublicServices(): Promise<PublicService[] | null> {
  return fetchList<PublicService>('/services/public');
}

/** Galería del salón (web pública). `null` si la API falla. */
export function getPublicGallery(): Promise<PublicGalleryItem[] | null> {
  return fetchList<PublicGalleryItem>('/content/gallery');
}

/** Testimonios aprobados del salón (web pública). `null` si la API falla. */
export function getApprovedTestimonials(): Promise<PublicTestimonial[] | null> {
  return fetchList<PublicTestimonial>('/content/testimonials');
}
