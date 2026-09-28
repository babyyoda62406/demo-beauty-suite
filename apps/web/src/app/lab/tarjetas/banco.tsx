'use client';

import * as React from 'react';
import {
  NOMBRES_DISENO,
  ORDEN_DISENOS,
  SimbolosTarjeta,
  TarjetaRegalo,
  type DatosTarjeta,
} from '@/components/gift-card/GiftCard';

function Campo({
  etiqueta,
  valor,
  onChange,
  ancho = 'w-44',
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  ancho?: string;
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium uppercase tracking-wider text-neutral-500">{etiqueta}</span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`${ancho} rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500`}
      />
    </label>
  );
}

/**
 * Banco de pruebas de las tarjetas.
 *
 * Los siete diseños con datos de mentira, para revisar la maqueta sin tener que
 * emitir tarjetas de verdad. No toca la API.
 */
export function Banco(): React.JSX.Element {
  const [datos, setDatos] = React.useState<DatosTarjeta>({
    para: 'Laura',
    de: 'Marta',
    enlace: 'https://estudioaurora.demo/regalo/ejemplo',
  });
  const [ancho, setAncho] = React.useState(460);

  return (
    <main className="min-h-dvh bg-neutral-100 pb-24 text-neutral-900">
      <SimbolosTarjeta />

      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end gap-x-6 gap-y-4 px-6 py-4">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold">Tarjetas regalo · maqueta</h1>
            <p className="text-xs text-neutral-500">
              Los siete diseños, con QR real. Toca una tarjeta para girarla. Vista local, sin API.
            </p>
          </div>

          <Campo
            etiqueta="Para"
            valor={datos.para}
            onChange={(v) => setDatos((d) => ({ ...d, para: v }))}
          />
          <Campo etiqueta="De" valor={datos.de} onChange={(v) => setDatos((d) => ({ ...d, de: v }))} />
          <Campo
            etiqueta="Enlace del QR"
            valor={datos.enlace}
            onChange={(v) => setDatos((d) => ({ ...d, enlace: v }))}
            ancho="w-96"
          />

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium uppercase tracking-wider text-neutral-500">Tamaño</span>
            <input
              type="range"
              min={280}
              max={720}
              step={20}
              value={ancho}
              onChange={(e) => setAncho(Number(e.target.value))}
              className="w-40 accent-neutral-800"
            />
          </label>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-6 pt-10">
        <ul className="flex flex-wrap gap-8">
          {ORDEN_DISENOS.map((d) => (
            <li key={d} style={{ width: ancho }}>
              <TarjetaRegalo diseno={d} datos={datos} />
              <p className="mt-2 text-xs text-neutral-500">{NOMBRES_DISENO[d]}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
