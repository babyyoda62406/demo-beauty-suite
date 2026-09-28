import * as React from 'react';
import type { Metadata } from 'next';
import { Banco } from './banco';

export const metadata: Metadata = {
  title: 'Maqueta · Tarjeta regalo',
  // Es una vista de trabajo, no una página del sitio.
  robots: { index: false, follow: false },
};

/**
 * Banco de pruebas de la tarjeta regalo.
 *
 * Vista local para juzgar la maquetación antes de plantearse el mecanismo de
 * tarjetas: no toca la API, no necesita sesión y no depende de nada del
 * backend. Se ve con `pnpm --filter web run dev` en /lab/tarjetas.
 */
export default function LabTarjetasPage(): React.JSX.Element {
  return <Banco />;
}
