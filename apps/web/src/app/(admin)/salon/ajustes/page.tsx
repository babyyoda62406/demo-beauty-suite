import * as React from 'react';
import type { Metadata } from 'next';
import { AjustesView } from '@/components/ajustes';

export const metadata: Metadata = {
  title: 'Ajustes del salón',
  description: 'Branding, datos del negocio y activación de módulos.',
};

/**
 * Ajustes del salón (SPEC §9, panel `(admin)`). El contenido es interactivo
 * (formularios con previsualización en vivo), delegado a `AjustesView`.
 */
export default function AjustesPage(): React.JSX.Element {
  return <AjustesView />;
}
