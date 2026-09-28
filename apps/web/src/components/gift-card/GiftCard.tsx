'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';
import { DISENOS, NOMBRES_DISENO, SimbolosTarjeta, type DisenoId } from './disenos';
import './tarjeta.css';
import './disenos.css';

/**
 * La tarjeta regalo del salón.
 *
 * El diseño —las siete plantillas, su geometría y el giro— viene del prototipo
 * maquetado a partir de las referencias de la clienta y está en `disenos.tsx`.
 * Aquí solo se le da vida: el código QR de verdad, los nombres de quién la
 * recibe y quién la regala, y el volteo al tocarla.
 */

export type { DisenoId };
export { NOMBRES_DISENO };

/** Los siete diseños, en el orden en que se presentan. */
export const ORDEN_DISENOS = Object.keys(DISENOS) as DisenoId[];

/** El diseño que eligió la clienta. */
export const DISENO_POR_DEFECTO: DisenoId = 'd3';

export interface DatosTarjeta {
  /** Quién la recibe: el «Para:» de la tarjeta. */
  para: string;
  /** Quién la regala: el «De:». */
  de: string;
  /** Lo que se codifica en el QR (la URL de canje). */
  enlace: string;
}

/**
 * El código QR, dibujado como un único trazado.
 *
 * Un `<path>` con todos los módulos en vez de un `<rect>` por módulo: son
 * cientos, y así el marcado es una línea en lugar de mil nodos. Corrección de
 * errores alta, que es lo que permite poner el logotipo encima sin que deje de
 * leerse.
 */
function useQrPath(valor: string): { d: string; lado: number } {
  return React.useMemo(() => {
    const qr = QRCode.create(valor, { errorCorrectionLevel: 'H' });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const trozos: string[] = [];
    for (let y = 0; y < size; y += 1) {
      let x = 0;
      while (x < size) {
        if (data[y * size + x] !== 1) {
          x += 1;
          continue;
        }
        // se agrupan los módulos contiguos de la fila en un solo rectángulo
        let ancho = 1;
        while (x + ancho < size && data[y * size + x + ancho] === 1) ancho += 1;
        trozos.push(`M${x} ${y}h${ancho}v1h-${ancho}z`);
        x += ancho;
      }
    }
    return { d: trozos.join(''), lado: size };
  }, [valor]);
}

function Qr({ valor }: { valor: string }): React.JSX.Element {
  const { d, lado } = useQrPath(valor);
  return (
    <svg className="qr" viewBox={`0 0 ${lado} ${lado}`} role="img" aria-label="Código QR de la tarjeta">
      <path fill="currentColor" d={d} />
    </svg>
  );
}

export interface TarjetaRegaloProps {
  datos: DatosTarjeta;
  /** Plantilla a usar. Por defecto, la que eligió la clienta. */
  diseno?: DisenoId;
  /** Arranca por el reverso: útil para enseñar el QR de entrada. */
  reverso?: boolean;
  /** Sin giro: la tarjeta queda fija en la cara indicada (impresión, miniaturas). */
  fija?: boolean;
  className?: string;
}

/**
 * Una tarjeta, con sus dos caras.
 *
 * Se gira al tocarla o con Enter/Espacio. La cara oculta se marca `inert` para
 * que los lectores de pantalla no lean las dos a la vez.
 */
export function TarjetaRegalo({
  datos,
  diseno = DISENO_POR_DEFECTO,
  reverso = false,
  fija = false,
  className,
}: TarjetaRegaloProps): React.JSX.Element {
  const [girada, setGirada] = React.useState(reverso);
  const contenido = DISENOS[diseno];

  const girar = (): void => {
    if (!fija) setGirada((v) => !v);
  };

  return (
    // `data-d` es lo que engancha cada diseño con su bloque de CSS
    <div className={cn('scene', className)} data-d={diseno}>
      <div className="stage">
        <div
          className={cn('card3d', girada && 'is-flipped', fija && 'is-static')}
          {...(fija
            ? {}
            : {
                role: 'button',
                tabIndex: 0,
                'aria-pressed': girada,
                'aria-label': girada ? 'Ver el frente de la tarjeta' : 'Ver el dorso con el código QR',
                onClick: girar,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    girar();
                  }
                },
              })}
        >
          {contenido({
            para: datos.para,
            de: datos.de,
            qr: <Qr valor={datos.enlace} />,
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Las dos caras una debajo de otra, sin giro.
 *
 * Es lo que hace falta para imprimir o para exportar la tarjeta como imagen:
 * ahí no vale un elemento que esconde una cara con `backface-visibility`.
 */
export function TarjetaDesplegada({
  datos,
  diseno = DISENO_POR_DEFECTO,
  className,
}: {
  datos: DatosTarjeta;
  diseno?: DisenoId;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('space-y-6', className)}>
      <TarjetaRegalo datos={datos} diseno={diseno} fija />
      <TarjetaRegalo datos={datos} diseno={diseno} fija reverso />
    </div>
  );
}

export { SimbolosTarjeta };
