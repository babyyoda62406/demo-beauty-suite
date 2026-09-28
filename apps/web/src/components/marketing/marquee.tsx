import * as React from 'react';

const ITEMS = [
  'Manicura rusa',
  'Nail art de autor',
  'Uñas acrílicas',
  'Esmaltado semipermanente',
  'Pedicura spa',
  'Diseños a medida',
  'Reconstrucción integral',
] as const;

/**
 * Horizontal marquee of signature styles — the site's memorable "tira
 * editorial". Duplicated once for a seamless loop; pauses on reduced-motion
 * via the shared media query in globals.css.
 */
export function Marquee(): React.JSX.Element {
  const strip = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-gold/25 bg-ink py-5 text-cream">
      <div className="flex w-max animate-marquee gap-10 pl-10 will-change-transform">
        {strip.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
            <span className="font-serif text-2xl font-light italic tracking-tight sm:text-3xl">
              {item}
            </span>
            <span className="text-gold" aria-hidden="true">
              ✦
            </span>
          </span>
        ))}
      </div>
      {/* Edge fades. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}
