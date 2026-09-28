import * as React from 'react';
import {
  About,
  Contact,
  CtaReserva,
  Gallery,
  Hero,
  Marquee,
  Services,
  Spa,
  Testimonials,
} from '@/components/marketing';
import {
  getApprovedTestimonials,
  getPublicGallery,
  getPublicServices,
} from '@/lib/public-content';

/** ISR corto: el contenido del CMS de Aurora se refresca en ~60 s. */
export const revalidate = 60;

/**
 * Landing page for Estudio Aurora — warm editorial direction. Orden según
 * el brief (Word 2026-08-03): Inicio → Sobre mí → Servicios → Pedi Spa →
 * Galería → Opiniones → Contacto. Los servicios, la galería y las opiniones se
 * leen de la API (lo que edita Aurora en el CMS); si la API falla, cada sección
 * cae con gracia a su contenido estático (`data.ts`).
 */
export default async function HomePage(): Promise<React.JSX.Element> {
  const [services, gallery, testimonials] = await Promise.all([
    getPublicServices(),
    getPublicGallery(),
    getApprovedTestimonials(),
  ]);

  return (
    <>
      <Hero />
      <Marquee />
      <About />
      <Services services={services} />
      <Spa services={services} />
      <Gallery items={gallery} />
      <Testimonials testimonials={testimonials} />
      <Contact />
      <CtaReserva />
    </>
  );
}
