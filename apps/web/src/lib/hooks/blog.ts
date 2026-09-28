import type { PaginatedResult } from '@fgd/types';
import { API_PREFIX } from '@/lib/bff';
import { getApiBaseUrl } from '@/lib/env';

/**
 * Server-side data layer for the public blog (SPEC §6/§9). These helpers run
 * only in Server Components / route handlers — they call the NestJS API
 * directly (not through the browser BFF proxy) and resolve the tenant via
 * the `X-Tenant` header, mirroring `TenantMiddleware`'s resolution order.
 */

/** Shape returned by `GET /content/blog` and `GET /content/blog/:slug` (public). */
export interface BlogPost {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  contentMdx: string;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBlogListParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  tag?: string | undefined;
}

/** Tenant slug used to resolve the active salon when no host/subdomain is present. */
const TENANT_HEADER = 'x-tenant';
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? 'aurora';

/** Seconds to keep the public blog response cached (Next.js data-cache revalidation). */
const REVALIDATE_SECONDS = 60;

function blogUrl(path = ''): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${API_PREFIX}/content/blog${path}`;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: { [TENANT_HEADER]: DEFAULT_TENANT_SLUG },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`No se pudo cargar el contenido del blog (${response.status})`);
  }
  return (await response.json()) as T;
}

/** Listado público paginado de artículos publicados. */
export async function getPublicBlogPosts(
  params: PublicBlogListParams = {},
): Promise<PaginatedResult<BlogPost>> {
  const search = new URLSearchParams();
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 9));
  if (params.tag) search.set('tag', params.tag);

  const result = await fetchJson<PaginatedResult<BlogPost>>(blogUrl(`?${search.toString()}`));
  return (
    result ?? {
      data: [],
      meta: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 9,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    }
  );
}

/** Artículo publicado por slug; `null` si no existe o no está publicado. */
export async function getPublicBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return fetchJson<BlogPost>(blogUrl(`/${encodeURIComponent(slug)}`));
}
