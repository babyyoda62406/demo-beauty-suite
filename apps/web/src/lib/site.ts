/**
 * Static salon/site metadata used across the marketing surface.
 * For the multi-tenant build these values will come from `Tenant.brand`;
 * here they are the defaults for the first tenant (Estudio Aurora).
 */

// TODO: número real de Aurora. La clienta aún no ha facilitado el WhatsApp.
// Se toma de `NEXT_PUBLIC_WHATSAPP` (formato internacional sin +, p. ej.
// 34600000000) con un placeholder de respaldo.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP ?? '34600000000';

/**
 * Dirección del estudio en una sola constante: antes estaba repetida en tres
 * sitios (texto, embed y enlace de Maps) y al corregir la localidad se quedó
 * desincronizada. La clienta confirmó que el estudio está en **Ciudad Demo**
 * (chat 2026-08-06), no en Sant Adrià de Besòs.
 * TODO: confirmar el número de la calle con la clienta (845 parece alto para
 * la calle de ejemplo); la corrección facilitada afectaba solo a la localidad.
 */
const STREET = 'Calle Ejemplo 123';
const CITY = 'Ciudad Demo';
const PROVINCE = 'Barcelona';
/** Dirección para buscar en Google Maps (sin paréntesis). */
const ADDRESS_QUERY = `${STREET}, ${CITY}, ${PROVINCE}`;

export const site = {
  name: 'Estudio Aurora',
  legalName: 'Estudio Aurora',
  whatsappNumber: WHATSAPP_NUMBER,
  whatsappMessage: 'Hola, me gustaría reservar una cita ✨',
  // TODO: teléfono real de Aurora (no facilitado). Se usa el mismo placeholder
  // que el WhatsApp para los textos legales.
  phoneDisplay: '+34 600 00 00 00',
  // TODO: correo real de Aurora (placeholder).
  email: 'hola@estudioaurora.demo',
  address: `${STREET}, ${CITY} (${PROVINCE})`,
  city: CITY,
  schedule: 'Con cita previa · escríbenos por WhatsApp',
  // Embed de Google Maps por dirección (no requiere API key).
  mapsEmbedUrl:
    'https://www.google.com/maps?q=' + encodeURIComponent(ADDRESS_QUERY) + '&output=embed',
  mapsLink:
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ADDRESS_QUERY),
  socials: {
    // Handles REALES facilitados por la clienta (chat 2026-08-04):
    // salón + academia. TikTok/Facebook siguen sin facilitar → placeholder.
    instagram: 'https://instagram.com/estudioaurora',
    instagramHandle: '@estudioaurora',
    instagramAcademia: 'https://instagram.com/estudioaurora',
    instagramAcademiaHandle: '@estudioaurora',
    tiktok: 'https://tiktok.com/',
    facebook: 'https://facebook.com/',
  },
} as const;

/** Build a wa.me deep link with a prefilled message. */
export function whatsappLink(message: string = site.whatsappMessage): string {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * ¿La URL de red social apunta a un PERFIL real (tiene handle) y no al
 * placeholder genérico (`https://instagram.com/`)? Sirve para ocultar los
 * iconos de redes mientras la clienta no facilite sus handles, en vez de
 * enlazar a la portada genérica de la red (enlace roto como propuesta de valor).
 * TODO: en cuanto Aurora dé sus handles, estos enlaces aparecen automáticamente.
 */
export function isRealSocialUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/+$/, '').length > 0;
  } catch {
    return false;
  }
}
