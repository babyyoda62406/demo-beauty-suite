'use client';

import * as React from 'react';
import { Download, Link2, Loader2, Printer } from 'lucide-react';
import {
  SimbolosTarjeta,
  TarjetaDesplegada,
  TarjetaRegalo,
  type DatosTarjeta,
  type DisenoId,
} from '@/components/gift-card/GiftCard';
import { cn } from '@/lib/utils';

/**
 * La tarjeta que recibe la clienta, con lo que puede hacer con ella.
 *
 * El giro lo trae el propio diseño: se toca la tarjeta y se da la vuelta, con
 * el QR del dorso escaneable directamente de la pantalla. Para imprimir o
 * descargar se usa la versión desplegada, con las dos caras planas, porque de
 * un elemento que esconde una cara en 3D no se puede capturar nada.
 */
export function Caras({
  datos,
  diseno,
  codigo,
}: {
  datos: DatosTarjeta;
  diseno: DisenoId;
  codigo: string;
}): React.JSX.Element {
  const [copiado, setCopiado] = React.useState(false);
  const [bajando, setBajando] = React.useState(false);
  const paraExportar = React.useRef<HTMLDivElement | null>(null);

  const copiarEnlace = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      // sin portapapeles (http, permisos): el enlace ya está en la barra
    }
  };

  const descargar = async (): Promise<void> => {
    const nodo = paraExportar.current;
    if (!nodo) return;
    setBajando(true);
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(nodo, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.href = url;
      a.download = `tarjeta-regalo-${codigo}.png`;
      a.click();
    } finally {
      setBajando(false);
    }
  };

  return (
    <div>
      <SimbolosTarjeta />

      <div className="print:hidden">
        <TarjetaRegalo datos={datos} diseno={diseno} />
      </div>

      {/* Copia fuera de pantalla, solo para exportar la imagen: `display:none`
          no se puede capturar. `aria-hidden` porque duplica la de arriba. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-200vw] top-0 w-[760px] print:hidden"
      >
        <div ref={paraExportar} className="bg-white p-6">
          <TarjetaDesplegada datos={datos} diseno={diseno} />
        </div>
      </div>

      {/* Al imprimir salen las dos caras, sin botones */}
      <div className="hidden print:block">
        <TarjetaDesplegada datos={datos} diseno={diseno} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full border border-gold/40 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-gold hover:bg-cream"
        >
          <Printer className="size-4" aria-hidden="true" />
          Imprimir
        </button>
        <button
          type="button"
          onClick={() => void descargar()}
          disabled={bajando}
          className="flex items-center gap-2 rounded-full border border-gold/40 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-gold hover:bg-cream disabled:opacity-60"
        >
          {bajando ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {bajando ? 'Preparando…' : 'Descargar'}
        </button>
        <button
          type="button"
          onClick={() => void copiarEnlace()}
          className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition',
            copiado
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-gold/40 bg-white text-ink hover:border-gold hover:bg-cream',
          )}
        >
          <Link2 className="size-4" aria-hidden="true" />
          {copiado ? '¡Enlace copiado!' : 'Copiar enlace'}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-ink-soft/70 print:hidden">
        Toca la tarjeta para darle la vuelta.
      </p>
    </div>
  );
}
