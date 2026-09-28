/**
 * Contenido REAL de la clienta (Estudio Aurora). Fuente de verdad:
 * `el catálogo de ejemplo`. Los precios se muestran como texto ("desde 35 €",
 * "20 €", "consultar", "incluido", "aparte") porque la clienta trabaja con
 * tarifas variables según largo/estado de la uña. El catálogo con importes en
 * céntimos para /reservar y el panel vive en `apps/api/prisma/seed.ts`.
 */

export interface ServiceItem {
  id: string;
  name: string;
  /** Precio tal y como lo comunica la clienta (texto libre). */
  price: string;
  /** Frase llamativa (gancho). */
  tagline: string;
  /** Texto largo que despliega el acordeón "Ver más". */
  description: string;
  /** Foto real del trabajo asociada al servicio. */
  image: string;
}

export const services: ServiceItem[] = [
  {
    id: 'acrilicas-esculpidas',
    name: 'Uñas acrílicas esculpidas',
    price: 'desde 35 €',
    tagline: 'Diseños únicos para unas manos que no pasan desapercibidas.',
    description:
      'Uñas creadas desde cero, adaptadas a la forma de tus manos y al largo que más te guste. Acabado resistente, elegante y personalizado. (El precio varía según el largo; 35 € ≈ talla M / nº 2.)',
    image: '/brand/gallery/acrilicas-1.jpg',
  },
  {
    id: 'relleno',
    name: 'Relleno de acrílico o gel',
    price: '25 €',
    tagline: 'Renueva tus uñas sin empezar desde cero.',
    description:
      'Mantenimiento del crecimiento de la uña para devolverle su forma, resistencia y acabado bonito.',
    image: '/brand/gallery/acrilicas-2.jpg',
  },
  {
    id: 'manicura-rusa',
    name: 'Manicura rusa',
    price: 'consultar',
    tagline: 'La diferencia está en los pequeños detalles.',
    description:
      'Limpieza profunda y detallada de la zona de la cutícula para un acabado más limpio, fino y profesional.',
    image: '/brand/gallery/manicura-rusa-1.jpg',
  },
  {
    id: 'semipermanente',
    name: 'Esmalte semipermanente',
    price: '20 €',
    tagline: 'Color, brillo y elegancia para cada día.',
    description:
      'Color brillante y duradero para lucir unas uñas cuidadas durante más tiempo, sin perder su aspecto natural.',
    image: '/brand/gallery/semipermanente-1.jpg',
  },
  {
    id: 'rubber',
    name: 'Cubrimiento con base rubber',
    price: '25 €',
    tagline: 'Uñas naturales, fuertes y bonitas.',
    description:
      'Refuerzo flexible para proteger la uña natural, corregir imperfecciones y ayudarla a crecer con más resistencia.',
    image: '/brand/gallery/rubber-1.jpg',
  },
  {
    id: 'pedicura-profunda',
    name: 'Pedicura profunda',
    price: '25 €',
    tagline: 'Pies bonitos, cuidados y renovados.',
    description:
      'Limpieza detallada de uñas y cutículas para dejar los pies cuidados, frescos y con apariencia más limpia.',
    image: '/brand/gallery/pedicura-1.jpg',
  },
  {
    id: 'pedi-spa',
    name: 'Pedi Spa',
    price: '35 €',
    tagline: 'El descanso y cuidado que tus pies se merecen.',
    description:
      'Servicio más completo para consentir los pies: limpieza, cuidado y un momento de relajación.',
    image: '/brand/gallery/pedicura-2.jpg',
  },
  {
    id: 'limpieza-pedicura',
    name: 'Limpieza de pedicura',
    price: '20 €',
    tagline: 'Cuidado esencial para unos pies impecables.',
    description:
      'Limpieza de uñas y cutículas para mantener los pies cuidados y saludables.',
    image: '/brand/gallery/limpieza-pedicura-1.jpg',
  },
  {
    id: 'reconstruccion',
    name: 'Reconstrucción de uña',
    price: 'consultar',
    tagline: 'Recupera la belleza natural de tus uñas.',
    description:
      'Reconstrucción de la uña dañada para devolverle forma y resistencia.',
    image: '/brand/gallery/reconstruccion-1.jpg',
  },
  {
    id: 'kids',
    name: 'Manicura y pedicura Kids',
    price: '20 €',
    tagline: 'Un momento especial lleno de color y diversión.',
    description:
      'Servicio bonito y delicado para las más pequeñas, con colores y diseños alegres adaptados a su edad.',
    image: '/brand/gallery/kids-1.jpg',
  },
  {
    id: 'disenos-personalizados',
    name: 'Diseños personalizados',
    price: 'incluido',
    tagline: 'Tú traes la idea y juntas la convertimos en diseño.',
    description:
      'Los diseños normales están incluidos. Elige colores, efectos y decoraciones a tu estilo.',
    image: '/brand/gallery/nail-art-1.jpg',
  },
  {
    id: 'flores-3d',
    name: 'Flores 3D / diseños en relieve',
    price: 'aparte',
    tagline: 'Pequeñas obras de arte creadas sobre tus uñas.',
    description:
      'Decoraciones hechas a mano en relieve para un acabado más artístico y especial. (Los diseños 3D se cobran aparte.)',
    image: '/brand/gallery/flores-3d-1.jpg',
  },
];

/** Nota general que se muestra discreta al final de la sección de servicios. */
export const servicesNote =
  'Los precios pueden variar según el largo, el estado de las uñas o el trabajo necesario. Retirada de acrílico de otro profesional: 10 €. Retirada de semipermanente de otro centro: 5 €. Diseños normales incluidos; diseños 3D aparte. Para consultar un diseño o reservar, escríbenos por WhatsApp.';

/** Categorías con las que se agrupan los servicios en la landing. */
export type ServiceCategory = 'unas' | 'manicura' | 'pedicura' | 'kids';

export interface ServiceCategoryGroup {
  id: ServiceCategory;
  /** Encabezado visible de la categoría. */
  label: string;
  /** Ids de `services` en el orden en que se muestran dentro de la categoría. */
  serviceIds: string[];
}

/**
 * Agrupación de los 12 servicios reales por categoría (orden de presentación).
 * Los ids referencian `services`; así no duplicamos datos ni precios.
 */
export const serviceCategories: ServiceCategoryGroup[] = [
  {
    id: 'unas',
    label: 'Uñas',
    serviceIds: ['acrilicas-esculpidas', 'relleno', 'rubber', 'reconstruccion'],
  },
  {
    id: 'manicura',
    label: 'Manicura',
    serviceIds: ['manicura-rusa', 'semipermanente', 'disenos-personalizados', 'flores-3d'],
  },
  {
    id: 'pedicura',
    label: 'Pedicura',
    serviceIds: ['pedicura-profunda', 'pedi-spa', 'limpieza-pedicura'],
  },
  {
    id: 'kids',
    label: 'Kids',
    serviceIds: ['kids'],
  },
];

const serviceById = new Map(services.map((service) => [service.id, service]));

/** Servicios resueltos y agrupados por categoría, listos para renderizar. */
export function servicesByCategory(): Array<{
  category: ServiceCategoryGroup;
  items: ServiceItem[];
}> {
  return serviceCategories.map((category) => ({
    category,
    items: category.serviceIds
      .map((id) => serviceById.get(id))
      .filter((service): service is ServiceItem => Boolean(service)),
  }));
}

/**
 * Categorías de la galería según el brief (Word 2026-08-03). Los prefijos de
 * fichero se mapean a estas categorías para no perder ninguna foto.
 */
export type GalleryCategory =
  | 'acrilicas'
  | 'natural'
  | 'manicura'
  | 'pedicura'
  | 'spa'
  | 'disenos'
  | 'antesDespues';

export interface GalleryItem {
  id: string;
  category: GalleryCategory;
  caption: string;
  /** Texto alternativo único por imagen (a11y + SEO). */
  alt: string;
  /** Ruta de la imagen real del trabajo de Aurora. */
  image: string;
  /** Hue de respaldo para el degradado si la imagen no carga. */
  hue: number;
}

/** Etiqueta legible por categoría (para captions). */
const CATEGORY_CAPTION: Record<GalleryCategory, string> = {
  acrilicas: 'Uñas acrílicas',
  natural: 'Uña natural',
  manicura: 'Manicura',
  pedicura: 'Pedicura',
  spa: 'Pedi Spa',
  disenos: 'Diseños',
  antesDespues: 'Antes y después',
};

const CATEGORY_HUE: Record<GalleryCategory, number> = {
  acrilicas: 330,
  natural: 320,
  manicura: 300,
  pedicura: 345,
  spa: 355,
  disenos: 315,
  antesDespues: 335,
};

/**
 * Imágenes reales en `public/brand/gallery/`. El prefijo del fichero mapea a
 * las categorías de la clienta (Uñas acrílicas · Uña natural · Manicura ·
 * Pedicura · Diseños). "Antes y después" se añade aparte con su imagen propia.
 */
const GALLERY_SOURCES: Array<{ file: string; category: GalleryCategory }> = [
  { file: 'acrilicas-1.jpg', category: 'acrilicas' },
  { file: 'acrilicas-2.jpg', category: 'acrilicas' },
  { file: 'acrilicas-3.jpg', category: 'acrilicas' },
  { file: 'acrilicas-4.jpg', category: 'acrilicas' },
  { file: 'acrilicas-5.jpg', category: 'acrilicas' },
  { file: 'reconstruccion-1.jpg', category: 'acrilicas' },
  { file: 'manicura-rusa-1.jpg', category: 'natural' },
  { file: 'manicura-rusa-2.jpg', category: 'natural' },
  { file: 'manicura-rusa-3.jpg', category: 'natural' },
  { file: 'rubber-1.jpg', category: 'natural' },
  { file: 'rubber-2.jpg', category: 'natural' },
  { file: 'rubber-3.jpg', category: 'natural' },
  { file: 'semipermanente-1.jpg', category: 'manicura' },
  { file: 'semipermanente-2.jpg', category: 'manicura' },
  { file: 'semipermanente-3.jpg', category: 'manicura' },
  { file: 'semipermanente-4.jpg', category: 'manicura' },
  { file: 'pedicura-1.jpg', category: 'pedicura' },
  { file: 'pedicura-2.jpg', category: 'pedicura' },
  { file: 'pedicura-3.jpg', category: 'pedicura' },
  { file: 'pedicura-4.jpg', category: 'pedicura' },
  { file: 'limpieza-pedicura-1.jpg', category: 'pedicura' },
  // Ritual Pedi Spa: material que envió la clienta el 2026-09-16.
  { file: 'pedi-spa-1.jpg', category: 'spa' },
  { file: 'pedi-spa-2.jpg', category: 'spa' },
  { file: 'nail-art-1.jpg', category: 'disenos' },
  { file: 'nail-art-2.jpg', category: 'disenos' },
  { file: 'nail-art-3.jpg', category: 'disenos' },
  { file: 'flores-3d-1.jpg', category: 'disenos' },
  { file: 'flores-3d-2.jpg', category: 'disenos' },
  { file: 'flores-3d-3.jpg', category: 'disenos' },
  { file: 'flores-3d-4.jpg', category: 'disenos' },
  { file: 'kids-1.jpg', category: 'disenos' },
  { file: 'kids-2.jpg', category: 'disenos' },
];

// Contador por categoría para numerar el alt de cada foto (a11y/SEO): así los
// lectores de pantalla no oyen el mismo texto repetido en imágenes distintas.
const categoryCount = new Map<GalleryCategory, number>();

export const galleryItems: GalleryItem[] = [
  ...GALLERY_SOURCES.map((src, index) => {
    const n = (categoryCount.get(src.category) ?? 0) + 1;
    categoryCount.set(src.category, n);
    return {
      id: `g-${index + 1}`,
      category: src.category,
      caption: CATEGORY_CAPTION[src.category],
      alt: `${CATEGORY_CAPTION[src.category]} ${n} — Estudio Aurora`,
      image: `/brand/gallery/${src.file}`,
      hue: CATEGORY_HUE[src.category],
    };
  }),
  {
    id: 'g-antes-despues',
    category: 'antesDespues' as GalleryCategory,
    caption: CATEGORY_CAPTION.antesDespues,
    alt: `${CATEGORY_CAPTION.antesDespues} — Estudio Aurora`,
    image: '/brand/before-after/antes-despues.jpg',
    hue: CATEGORY_HUE.antesDespues,
  },
];

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
}

/**
 * Aún no hay opiniones reales verificadas de la clienta. En lugar de mostrar
 * reseñas inventadas (con estrellas y nombres ficticios), la sección se queda
 * vacía y muestra un estado honesto "próximamente". La estructura se conserva
 * para publicar aquí las reseñas reales (con nombre/foto) en cuanto lleguen.
 * TODO: rellenar con opiniones reales de las clientas de Aurora.
 */
export const testimonials: Testimonial[] = [];

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  specialty: string;
  initials: string;
  /** Foto real (opcional). Si falta, se muestran las iniciales. */
  image?: string;
}

export const team: TeamMember[] = [
  {
    id: 'aurora',
    name: 'Estudio Aurora',
    title: 'Fundadora · Nail artist',
    specialty: 'Uñas acrílicas, manicura rusa y diseños personalizados',
    initials: 'DC',
    image: '/brand/salon/salon-5.jpg',
  },
];

