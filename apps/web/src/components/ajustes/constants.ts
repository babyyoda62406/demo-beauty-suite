import {
  BarChart3,
  CalendarDays,
  Heart,
  Newspaper,
  Package,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catálogo de módulos de negocio activables por el salón (SPEC §7).
 * La `key` cumple el patrón del backend (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) y se
 * persiste en el ajuste `modules.activation`.
 */
export interface ModuleDef {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Módulos base que no deberían desactivarse (agenda, clientas). */
  core?: boolean;
}

export const MODULES: readonly ModuleDef[] = [
  {
    key: 'agenda',
    label: 'Agenda y reservas',
    description: 'Calendario de citas, lista de espera y horarios.',
    icon: CalendarDays,
    core: true,
  },
  {
    key: 'clientas',
    label: 'Clientas (CRM)',
    description: 'Fichas, historial y fotos de tus clientas.',
    icon: Users,
    core: true,
  },
  {
    key: 'caja',
    label: 'Caja y pagos',
    description: 'Cobros, facturas, gastos y arqueo de caja.',
    icon: Wallet,
  },
  {
    key: 'inventario',
    label: 'Inventario',
    description: 'Productos, stock y proveedores.',
    icon: Package,
  },
  {
    key: 'empleadas',
    label: 'Empleadas',
    description: 'Equipo, comisiones y horarios del personal.',
    icon: Users,
  },
  {
    key: 'tienda',
    label: 'Tienda online',
    description: 'Catálogo y pedidos de la tienda web.',
    icon: ShoppingBag,
  },
  {
    key: 'fidelizacion',
    label: 'Fidelización',
    description: 'Tarjetas de sellos, bonos y tarjetas regalo.',
    icon: Heart,
  },
  {
    key: 'blog',
    label: 'Blog y contenido',
    description: 'Entradas de blog, galería y testimonios.',
    icon: Newspaper,
  },
  {
    key: 'estadisticas',
    label: 'Estadísticas',
    description: 'Cuadros de mando con métricas del salón.',
    icon: BarChart3,
  },
];

/** Módulos activados por defecto cuando el salón aún no ha guardado nada. */
export function defaultModulesState(): Record<string, boolean> {
  return Object.fromEntries(MODULES.map((m) => [m.key, true]));
}

/** Fuentes de marca disponibles (cargadas por la app / websafe). */
export interface FontOption {
  value: string;
  label: string;
  /** Familia CSS aplicable en la previsualización. */
  stack: string;
}

export const DISPLAY_FONTS: readonly FontOption[] = [
  { value: 'Dancing Script', label: 'Dancing Script (script)', stack: "'Dancing Script', cursive" },
  { value: 'Playfair Display', label: 'Playfair Display (serif)', stack: "'Playfair Display', Georgia, serif" },
  { value: 'Great Vibes', label: 'Great Vibes (caligrafía)', stack: "'Great Vibes', cursive" },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond (serif)', stack: "'Cormorant Garamond', Georgia, serif" },
];

export const BODY_FONTS: readonly FontOption[] = [
  { value: 'Poppins', label: 'Poppins', stack: "'Poppins', ui-sans-serif, system-ui, sans-serif" },
  { value: 'Inter', label: 'Inter', stack: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { value: 'Montserrat', label: 'Montserrat', stack: "'Montserrat', ui-sans-serif, system-ui, sans-serif" },
  { value: 'Nunito Sans', label: 'Nunito Sans', stack: "'Nunito Sans', ui-sans-serif, system-ui, sans-serif" },
];

/** Resuelve la familia CSS de una fuente por su nombre (con fallback sans). */
export function fontStack(name: string | undefined, fonts: readonly FontOption[]): string {
  const found = fonts.find((f) => f.value === name);
  return found ? found.stack : 'ui-sans-serif, system-ui, sans-serif';
}

/** Redes sociales soportadas en `brand.socials`. */
export const SOCIAL_FIELDS: readonly { key: string; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu-salon' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu-salon' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@tu-salon' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@tu-salon' },
  { key: 'website', label: 'Sitio web', placeholder: 'https://tu-salon.com' },
];

/** Días de la semana (lunes primero) para los horarios. */
export const WEEKDAYS: readonly { key: string; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

/** Color primario de marca por defecto (SPEC §8, magenta principal). */
export const DEFAULT_PRIMARY = '#D6157F';

/** Clave usada dentro de `brand.colors` para el color primario. */
export const PRIMARY_COLOR_KEY = 'brand-500';
