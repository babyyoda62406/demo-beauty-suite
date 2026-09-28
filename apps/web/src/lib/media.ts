/**
 * Resolución de URLs de imagen para el CMS de la clienta.
 *
 * La API devuelve rutas relativas `"/uploads/<fichero>"` (ver
 * `uploads.controller.ts`). El fichero real se sirve en `GET /api/v1/uploads/…`,
 * al que el navegador llega a través del proxy BFF (`/api/proxy/uploads/…`).
 * Las imágenes estáticas de marca (`/brand/…`) y las URLs absolutas se dejan
 * intactas. Un valor vacío cae a un placeholder para no romper el layout.
 */

/**
 * Placeholder mostrado cuando no hay imagen (data URI, sin peticiones de red).
 * Los colores van con `#` literal: `encodeURIComponent` ya lo codifica a `%23`.
 * (Si se pre-codifica `%23`, se re-codifica a `%2523` → color inválido → el SVG
 * cae a negro por defecto: de ahí los cuadros negros que se veían antes.)
 */
export const MEDIA_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>" +
      "<rect width='100%' height='100%' fill='#f4e4ec'/>" +
      "<text x='50%' y='50%' font-family='sans-serif' font-size='20' fill='#9d0e4b' " +
      "text-anchor='middle' dominant-baseline='middle'>Sin foto</text></svg>",
  );

/**
 * Resuelve la URL de una imagen que puede venir de la API o ser estática.
 *
 * - Vacío/undefined → placeholder.
 * - `http(s)://…`, `data:…` o `/brand/…` → tal cual (estáticas / absolutas).
 * - `/uploads/<x>` → `/api/proxy/uploads/<x>` (servido real vía BFF).
 * - Cualquier otra ruta relativa → tal cual.
 */
export function mediaUrl(url: string | null | undefined): string {
  const value = url?.trim();
  if (!value) return MEDIA_PLACEHOLDER;
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('/brand/')
  ) {
    return value;
  }
  if (value.startsWith('/uploads/')) {
    return `/api/proxy${value}`;
  }
  return value;
}

/** ¿La URL apunta a un placeholder externo (p.ej. `placehold.co`) a filtrar? */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  return Boolean(url && url.toLowerCase().includes('placehold'));
}
