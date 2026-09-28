import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

/** Split-screen auth shell: brand panel + centered form column. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel de marca: el logo a gran tamaño es el protagonista.
          El fondo va en rosa claro, no en el magenta fuerte de antes: el
          logotipo es magenta y sobre magenta no se distinguía. */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-cream via-brand-50 to-brand-100 lg:block">
        <div className="absolute inset-0 bg-warm-mesh opacity-50" aria-hidden="true" />
        {/* Filete rose-gold que separa el panel de la columna del formulario. */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" aria-hidden="true" />

        <div className="relative flex h-full flex-col items-center justify-center gap-10 p-12">
          <Link href="/" className="block w-full max-w-xl transition-transform hover:scale-[1.02]">
            <Image
              src="/brand/logo@2x.png"
              alt="Estudio Aurora"
              width={2160}
              height={1344}
              priority
              sizes="(min-width: 1024px) 40vw, 0px"
              className="h-auto w-full drop-shadow-[0_18px_40px_rgba(214,21,127,0.18)]"
            />
          </Link>

          <div className="max-w-md text-center">
            <p className="font-serif text-3xl font-semibold leading-tight text-ink">
              Belleza que se cuida en cada detalle.
            </p>
            <p className="mt-3 text-ink-soft">
              Gestiona tus citas, tu tarjeta de fidelización y tus diseños favoritos desde un
              único lugar.
            </p>
          </div>
        </div>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center bg-surface-subtle p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* En móvil no hay panel de marca: el logo va sobre el formulario.
              Transparente y a lo ancho, no recortado en un círculo. */}
          <Link href="/" className="mx-auto mb-8 block w-full max-w-[15rem] lg:hidden">
            <Image
              src="/brand/logo@2x.png"
              alt="Estudio Aurora"
              width={2160}
              height={1344}
              priority
              sizes="240px"
              className="h-auto w-full"
            />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
